import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Package, DollarSign, Search, FileText, Truck, CreditCard } from 'lucide-react';

const commands = [
  {
    category: 'Shipment Updates',
    icon: Package,
    items: [
      {
        command: 'New shipment LOT 883 from HUBEI to FOOTFOCUS, ETA May 10',
        description: 'Creates a new shipment with supplier, client and ETA',
        response: '✅ NEW SHIPMENT CREATED with tracking details'
      },
      {
        command: 'LOT 881 documents submitted',
        description: 'Marks documents as submitted (uses today\'s date)',
        response: '✅ LOT 881 UPDATED with document status'
      },
      {
        command: 'LOT 881 documents submitted on April 14',
        description: 'Marks documents submitted with specific date',
        response: '✅ LOT 881 UPDATED with document date'
      },
      {
        command: 'LOT 881 telex released',
        description: 'Marks telex as released',
        response: '✅ LOT 881 UPDATED with telex status'
      },
      {
        command: 'LOT 881 delivered today',
        description: 'Marks shipment as delivered',
        response: '✅ LOT 881 UPDATED - Delivered'
      },
      {
        command: 'LOT 881 delivered on April 18',
        description: 'Marks delivered with specific date',
        response: '✅ LOT 881 UPDATED with delivery date'
      }
    ]
  },
  {
    category: 'Costs & Invoices',
    icon: FileText,
    items: [
      {
        command: 'LOT 881 costs: supplier $105k, freight $1.2k',
        description: 'Adds cost breakdown (creates supplier ledger debit)',
        response: '✅ LOT 881 COSTS UPDATED with ZAR calculation'
      },
      {
        command: 'LOT 881 invoice from WINTEX #01823 for $106k',
        description: 'Records supplier invoice with reference number',
        response: '✅ COSTS recorded with invoice number'
      },
      {
        command: 'Invoiced MJ R2.05M for LOT 881',
        description: 'Adds client invoice and calculates all profit metrics',
        response: '💰 PROFIT CALCULATED with full breakdown'
      }
    ]
  },
  {
    category: 'Payments',
    icon: CreditCard,
    items: [
      {
        command: 'Paid WINTEX $106k at R18.46 via SWISS',
        description: 'Records payment with FX rate and bank (creates ledger credit + commission)',
        response: '✅ PAYMENT RECORDED with commission and updated balance'
      },
      {
        command: 'Paid HUBEI €9320 at R20.45 via FNB',
        description: 'Records EUR payment through FNB bank',
        response: '✅ PAYMENT RECORDED with ZAR conversion'
      }
    ]
  },
  {
    category: 'Queries',
    icon: Search,
    items: [
      {
        command: 'Show LOT 881',
        description: 'Gets full shipment details including costs and profit',
        response: '📦 LOT 881 DETAILS with complete breakdown'
      },
      {
        command: 'Show pending shipments',
        description: 'Lists all pending shipments',
        response: '📦 PENDING SHIPMENTS list with ETAs'
      },
      {
        command: 'Show WINTEX balance',
        description: 'Gets supplier balance and recent transactions',
        response: '📊 SUPPLIER BALANCE with transaction history'
      },
      {
        command: 'Show deliveries this week',
        description: 'Lists shipments scheduled for delivery this week',
        response: '🚚 DELIVERIES THIS WEEK list'
      }
    ]
  }
];

export function WhatsAppCommands() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp Command Reference
          </CardTitle>
          <CardDescription>
            Send these commands via WhatsApp to update shipments automatically.
            The n8n workflow parses your message and calls the appropriate API endpoint.
          </CardDescription>
        </CardHeader>
      </Card>

      {commands.map((section) => (
        <Card key={section.category}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <section.icon className="h-4 w-4 text-primary" />
              {section.category}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.items.map((item, index) => (
              <div key={index}>
                {index > 0 && <Separator className="my-4" />}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="font-mono text-xs shrink-0 mt-0.5">
                      Example
                    </Badge>
                    <code className="text-sm bg-muted px-2 py-1 rounded break-all">
                      "{item.command}"
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground pl-16">
                    {item.description}
                  </p>
                  <div className="flex items-start gap-2 pl-16">
                    <Badge variant="outline" className="text-xs shrink-0">Response</Badge>
                    <span className="text-sm text-muted-foreground">{item.response}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">💡 Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Commands are parsed by AI, so natural variations work (e.g., "docs submitted" = "documents submitted")</p>
          <p>• Supplier names are matched partially (e.g., "WINTEX" matches "WINTEX - ADNAN")</p>
          <p>• Amounts can use shorthand (e.g., "$105k" = "$105,000")</p>
          <p>• Dates can be natural (e.g., "today", "yesterday", "April 14")</p>
          <p>• All updates are logged and visible in the Automation Status tab</p>
        </CardContent>
      </Card>
    </div>
  );
}
