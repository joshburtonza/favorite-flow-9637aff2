import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useFavorites() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all favorites for the current user
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['user-favorites'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Check if an item is favorited
  const isFavorite = (itemId: string, itemType: 'file' | 'folder') => {
    return favorites.some(f => f.item_id === itemId && f.item_type === itemType);
  };

  // Toggle favorite
  const toggleFavorite = useMutation({
    mutationFn: async ({ itemId, itemType }: { itemId: string; itemType: 'file' | 'folder' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const existing = favorites.find(f => f.item_id === itemId && f.item_type === itemType);

      if (existing) {
        // Remove favorite
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('id', existing.id);
        
        if (error) throw error;
        return { action: 'removed' };
      } else {
        // Add favorite
        const { error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            item_id: itemId,
            item_type: itemType,
            display_order: favorites.length,
          });
        
        if (error) throw error;
        return { action: 'added' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
      toast({
        title: result.action === 'added' ? 'Added to favorites' : 'Removed from favorites',
        duration: 2000,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reorder favorites
  const reorderFavorites = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        display_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('user_favorites')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
    },
  });

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    reorderFavorites,
  };
}
