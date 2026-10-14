import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Input, Card, CardBody, Button } from '@heroui/react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import SubtitleModal from '../components/SubtitleModal';

interface LibraryItem {
  itemId: string;
  name: string | null;
  type: string;
  thumbnailUrl: string | null;
  hasSubtitles: boolean;
  subtitles: Array<{
    index: number;
    language: string;
  }>;
}

const PAGE_SIZE = 50;

function LibraryPage() {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state || {}) as { libraryType?: string; libraryName?: string };

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [libraryType, setLibraryType] = useState<'Movies' | 'TvShows' | null>(null);
  const [subtitleModalOpen, setSubtitleModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);

  const resolveLibraryType = (rows: LibraryItem[], hinted?: string) => {
    const hint = (hinted || '').toLowerCase();
    if (hint === 'tvshows') return 'TvShows';
    if (hint === 'movies') return 'Movies';
    if (rows.some((r) => r.type === 'Series')) return 'TvShows';
    return 'Movies';
  };

  const fetchPage = useCallback(
    async (query: string, pageOffset: number, append: boolean) => {
      if (!libraryId) return;

      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(pageOffset));
      if (query.trim()) {
        params.append('search', query.trim());
      }

      const response = await fetch(`/libraries/${libraryId}/items?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch items: ${response.status}`);
      }
      const data: LibraryItem[] = await response.json();

      setItems((prev) => (append ? [...prev, ...data] : data));
      setHasMore(data.length >= PAGE_SIZE);
      setOffset(pageOffset + data.length);
      setLibraryType((prev) => prev || resolveLibraryType(data, navState.libraryType));
    },
    [libraryId, navState.libraryType],
  );

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      setIsSearching(true);
      setError(null);
      try {
        await fetchPage(query, 0, false);
      } catch (err) {
        console.error('Error searching items:', err);
        setError('Failed to search items');
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [fetchPage],
  );

  useEffect(() => {
    const fetchInitialItems = async () => {
      if (!libraryId) return;

      setLoading(true);
      setError(null);

      try {
        await fetchPage('', 0, false);
      } catch (err) {
        console.error('Error fetching library items:', err);
        setError('Failed to load library items. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialItems();
  }, [libraryId, fetchPage]);

  useEffect(() => {
    if (!loading) {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>('input[aria-label="Search library"]');
        el?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    setError(null);
    try {
      await fetchPage(searchQuery, offset, true);
    } catch (err) {
      console.error('Error loading more items:', err);
      setError('Failed to load more items');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleItemClick = (item: LibraryItem) => {
    if (libraryType === 'TvShows' || item.type === 'Series') {
      navigate(`/tvshow/${item.itemId}`);
    } else {
      setSelectedItem(item);
      setSubtitleModalOpen(true);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const getSearchStatusText = () => {
    if (isSearching) return 'Searching...';
    if (searchQuery.trim()) {
      return `Showing ${items.length} ${items.length === 1 ? 'result' : 'results'} — press Esc or clear to reset`;
    }
    return 'Tip: press / to focus search';
  };

  const title =
    navState.libraryName ||
    (libraryType === 'Movies' ? 'Movies' : libraryType === 'TvShows' ? 'TV Shows' : 'Library');

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">{title}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 20 }, (_, i) => (
            <Card key={i} className="bg-gray-800 animate-pulse">
              <CardBody className="p-0">
                <div className="aspect-[2/3] bg-gray-700" />
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">{title}</h1>
        <div className="text-red-400 text-center" role="alert">
          <p>{error}</p>
          <Button className="mt-4" color="primary" onPress={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <Button variant="ghost" className="mb-4" onPress={() => navigate('/')}>
          ← Libraries
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">{title}</h1>

        <div className="max-w-md mb-2">
          <Input
            type="search"
            aria-label="Search library"
            placeholder={`Search ${libraryType === 'Movies' ? 'movies' : 'TV shows'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') clearSearch();
            }}
            startContent={<MagnifyingGlassIcon className="w-4 h-4" />}
            endContent={
              searchQuery ? (
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  aria-label="Clear search"
                  onPress={clearSearch}
                  className="text-gray-400 hover:text-white"
                >
                  <XMarkIcon className="w-4 h-4" />
                </Button>
              ) : null
            }
          />
          <p className="text-sm text-gray-400 mt-2">{getSearchStatusText()}</p>
          {error && (
            <p className="text-sm text-red-400 mt-1" role="alert">{error}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {items.map((item) => (
          <Card
            key={item.itemId}
            isPressable
            className="bg-gray-800 hover:bg-gray-700 transition-colors group"
            onPress={() => handleItemClick(item)}
          >
            <CardBody className="p-0">
              <div className="aspect-[2/3] bg-gray-700 rounded-t-lg overflow-hidden relative">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.name || 'Item'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                    No Image
                  </div>
                )}

                {item.hasSubtitles && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    CC
                  </div>
                )}
              </div>

              <div className="p-3">
                <h3 className="font-medium text-sm line-clamp-2" title={item.name || 'Unnamed'}>
                  {item.name || 'Unnamed'}
                </h3>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {items.length === 0 && !isSearching && (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">
            {searchQuery
              ? `No items found for "${searchQuery}"`
              : 'This library is empty.'}
          </p>
          {searchQuery && (
            <Button onPress={clearSearch} variant="ghost">
              Clear search
            </Button>
          )}
        </div>
      )}

      {hasMore && items.length > 0 && (
        <div className="flex justify-center mt-8">
          <Button color="primary" isLoading={loadingMore} onPress={handleLoadMore}>
            Load more
          </Button>
        </div>
      )}

      {selectedItem && (
        <SubtitleModal
          isOpen={subtitleModalOpen}
          onClose={() => setSubtitleModalOpen(false)}
          itemId={selectedItem.itemId}
          itemName={selectedItem.name || 'Unknown'}
          subtitles={selectedItem.subtitles}
        />
      )}
    </div>
  );
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default LibraryPage;
