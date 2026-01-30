import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Color constants (ARGB format for ExcelJS)
const COLORS = {
  YELLOW_HIGHLIGHT: 'FFFFFF00',
  GREEN_PROFIT: 'FF90EE90',
  LIGHT_BLUE_HEADER: 'FFD6EAF8',
  DARK_BLUE: 'FF4472C4',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { document_type, data, template_id, shipment_id } = await req.json();

    console.log(`[Generate] Creating ${document_type} document`);

    // Get template if specified
    let template = null;
    if (template_id) {
      const { data: t } = await supabase
        .from('document_templates')
        .select('*')
        .eq('id', template_id)
        .single();
      template = t;
    } else {
      // Get default template for type
      const { data: t } = await supabase
        .from('document_templates')
        .select('*')
        .eq('document_type', document_type)
        .eq('is_default', true)
        .single();
      template = t;
    }

    let fileBuffer: Uint8Array;
    let fileName: string;
    let mimeType: string;

    switch (document_type) {
      case 'file_costing':
        const costingResult = await generateFileCostingExcel(data);
        fileBuffer = costingResult.buffer;
        fileName = `LOT_${data.lot_number}_FILE_COSTING.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;

      case 'client_invoice':
        // For now, return error - PDF generation requires different approach in Deno
        return new Response(JSON.stringify({
          success: false,
          error: 'PDF generation not yet implemented in edge function. Use client-side generation.'
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unsupported document type: ${document_type}`
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Upload to storage
    const filePath = `generated/${document_type}/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Log document generation
    await supabase.from('uploaded_documents').insert({
      file_name: fileName,
      original_name: fileName,
      file_path: filePath,
      file_type: mimeType,
      file_size: fileBuffer.length,
      template_id: template?.id,
      shipment_id: shipment_id || null,
      document_type,
      status: 'processed',
      format_metadata: { 
        generated: true, 
        template_version: template?.version || 1,
        generated_at: new Date().toISOString()
      }
    });

    console.log(`[Generate] Created ${fileName} (${fileBuffer.length} bytes)`);

    return new Response(JSON.stringify({
      success: true,
      file_name: fileName,
      file_path: filePath,
      download_url: urlData.publicUrl,
      size: fileBuffer.length
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[Generate] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

/**
 * Generate File Costing Excel using native Deno approach
 * Uses a simplified XLSX structure without external dependencies
 */
async function generateFileCostingExcel(data: any): Promise<{ buffer: Uint8Array }> {
  // Import ExcelJS for Deno
  const ExcelJS = await import('npm:exceljs@4.4.0');
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'Favorite Logistics FLAIR';
  workbook.created = new Date();
  
  const ws = workbook.addWorksheet('File Costing');

  // Set column widths
  ws.columns = [
    { width: 30 },
    { width: 15 },
    { width: 30 },
    { width: 15 },
    { width: 15 },
  ];

  // Row 1: Main Header
  ws.getCell('A1').value = `LOT ${data.lot_number || 'N/A'} - ${data.supplier_name || 'Unknown'} - DOC ${data.client_name || 'Unknown'}`;
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: COLORS.DARK_BLUE } };
  ws.getRow(1).height = 24;

  // Row 2-3: Basic info
  ws.getCell('A2').value = data.commodity || 'General Cargo';
  ws.getCell('B2').value = data.container_type || '40HQ';
  ws.getCell('B2').font = { bold: true };
  ws.getCell('A3').value = 'DELIVERY';
  ws.getCell('A3').font = { bold: true };
  ws.getCell('B3').value = data.delivery_route || 'DBN - DBN';

  // FOB Section
  ws.getCell('A5').value = 'FOB';
  ws.getCell('A5').font = { bold: true };
  ws.getCell('B5').value = data.fob_amount || data.supplier_cost || 0;
  ws.getCell('B5').numFmt = '#,##0.00';

  ws.getCell('A7').value = 'TOTAL';
  ws.getCell('A7').font = { bold: true };
  ws.getCell('B7').value = { formula: '=SUM(B5:B6)' };
  ws.getCell('B7').font = { bold: true };
  ws.getCell('B7').numFmt = '#,##0.00';
  ws.getCell('B7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_BLUE_HEADER } };
  
  ws.getCell('C7').value = { formula: '=B7*B9' };
  ws.getCell('C7').font = { bold: true };
  ws.getCell('C7').numFmt = 'R #,##0.00';
  ws.getCell('C7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_BLUE_HEADER } };

  // Exchange Rates
  ws.getCell('A9').value = 'ROE - OURS';
  ws.getCell('B9').value = data.fx_applied_rate || data.roe_ours || 18.50;
  ws.getCell('B9').numFmt = '#,##0.0000';
  ws.getCell('C9').value = 'ESTIMATE';
  ws.getCell('C9').font = { italic: true, color: { argb: 'FF808080' } };

  // ROE CLIENT - Yellow Highlight
  ws.getCell('A10').value = 'ROE - CLIENT';
  ws.getCell('A10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.YELLOW_HIGHLIGHT } };
  ws.getCell('A10').font = { bold: true };
  ws.getCell('B10').value = data.fx_client_rate || data.roe_client || data.fx_applied_rate || 18.50;
  ws.getCell('B10').numFmt = '#,##0.0000';
  ws.getCell('B10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.YELLOW_HIGHLIGHT } };
  ws.getCell('B10').font = { bold: true };

  // Clearing Section Headers
  ws.getCell('C12').value = 'VAT';
  ws.getCell('C12').font = { bold: true };
  ws.getCell('D12').value = 'AMOUNT';
  ws.getCell('D12').font = { bold: true };

  // Clearing Agent Total
  ws.getCell('A14').value = 'CLEARING AGENT TOTAL (EX VAT)';
  ws.getCell('A14').font = { bold: true };
  ws.getCell('B14').value = { formula: '=SUM(B16:B20)' };
  ws.getCell('B14').font = { bold: true };
  ws.getCell('B14').numFmt = 'R #,##0.00';
  ws.getCell('B14').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_BLUE_HEADER } };

  ws.getCell('C14').value = 'INC VAT';
  ws.getCell('C14').font = { bold: true };
  ws.getCell('D14').value = { formula: '=D20+B14' };
  ws.getCell('D14').font = { bold: true };
  ws.getCell('D14').numFmt = 'R #,##0.00';

  // Clearing Costs
  ws.getCell('A16').value = 'CUSTOMS DUTY';
  ws.getCell('B16').value = data.customs_duty || 0;
  ws.getCell('B16').numFmt = 'R #,##0.00';
  ws.getCell('C16').value = 'CUSTOMS VAT';
  ws.getCell('D16').value = data.customs_vat || 0;
  ws.getCell('D16').numFmt = 'R #,##0.00';

  ws.getCell('A17').value = 'CUSTOMS VAT';
  ws.getCell('C17').value = 'CARGO DUES VAT';
  ws.getCell('D17').value = { formula: '=B19*0.15' };
  ws.getCell('D17').numFmt = 'R #,##0.00';

  ws.getCell('A18').value = 'CONTAINER LANDING';
  ws.getCell('B18').value = data.container_landing || 0;
  ws.getCell('B18').numFmt = 'R #,##0.00';
  ws.getCell('C18').value = 'AGENCY VAT';
  ws.getCell('D18').value = { formula: '=B20*0.15' };
  ws.getCell('D18').numFmt = 'R #,##0.00';

  ws.getCell('A19').value = 'CARGO DUES';
  ws.getCell('B19').value = data.cargo_dues || 0;
  ws.getCell('B19').numFmt = 'R #,##0.00';

  ws.getCell('A20').value = 'AGENCY';
  ws.getCell('B20').value = data.agency_fee || 0;
  ws.getCell('B20').numFmt = 'R #,##0.00';
  ws.getCell('D20').value = { formula: '=SUM(D16:D19)' };
  ws.getCell('D20').numFmt = 'R #,##0.00';
  ws.getCell('D20').font = { bold: true };

  // Transport Section
  ws.getCell('A23').value = 'TRANSPORT';
  ws.getCell('A23').font = { bold: true };
  ws.getCell('B23').value = data.transport_cost || 0;
  ws.getCell('B23').numFmt = 'R #,##0.00';

  // Bank Section
  ws.getCell('A26').value = 'BANK CHARGES';
  ws.getCell('B26').value = data.bank_charges || 0;
  ws.getCell('B26').numFmt = 'R #,##0.00';

  ws.getCell('A27').value = 'FX COMMISSION';
  ws.getCell('B27').value = data.fx_commission || data.fx_commission_zar || 0;
  ws.getCell('B27').numFmt = 'R #,##0.00';

  // Grand Totals
  ws.getCell('A30').value = 'TOTAL COST ZAR';
  ws.getCell('A30').font = { bold: true, size: 11 };
  ws.getCell('B30').value = { formula: '=C7+B14+D20+B23+B26+B27' };
  ws.getCell('B30').font = { bold: true, size: 11 };
  ws.getCell('B30').numFmt = 'R #,##0.00';
  ws.getCell('B30').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_BLUE_HEADER } };

  // Client Invoice - Green
  ws.getCell('A31').value = 'CLIENT INVOICE';
  ws.getCell('A31').font = { bold: true, size: 11 };
  ws.getCell('A31').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREEN_PROFIT } };
  ws.getCell('B31').value = data.client_invoice_zar || 0;
  ws.getCell('B31').font = { bold: true, size: 11 };
  ws.getCell('B31').numFmt = 'R #,##0.00';
  ws.getCell('B31').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREEN_PROFIT } };

  // Profit - Green
  ws.getCell('A32').value = 'PROFIT';
  ws.getCell('A32').font = { bold: true, size: 12 };
  ws.getCell('A32').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREEN_PROFIT } };
  ws.getCell('B32').value = { formula: '=B31-B30' };
  ws.getCell('B32').font = { bold: true, size: 12 };
  ws.getCell('B32').numFmt = 'R #,##0.00';
  ws.getCell('B32').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREEN_PROFIT } };

  // Margin %
  ws.getCell('A33').value = 'MARGIN %';
  ws.getCell('A33').font = { italic: true };
  ws.getCell('B33').value = { formula: '=IF(B31>0,B32/B31*100,0)' };
  ws.getCell('B33').numFmt = '0.00"%"';

  // Footer
  ws.getCell('A35').value = `Generated: ${new Date().toLocaleString()}`;
  ws.getCell('A35').font = { italic: true, size: 8, color: { argb: 'FF808080' } };

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer: new Uint8Array(buffer as ArrayBuffer) };
}
