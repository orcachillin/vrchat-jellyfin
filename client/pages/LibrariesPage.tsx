import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, Button } from '@heroui/react';
import { useNavigate } from 'react-router-dom';

interface Library {
  itemId: string;
  name: string | null;
  type: string;
  thumbnailUrl: string | null;
}

const BROWSEABLE = new Set(['movies', 'tvshows']);

function libraryLabel(type: string): string {
  const t = (type || '').toLowerCase();
  if (t === 'movies') return 'movies';
  if (t === 'tvshows') return 'TV shows';
  return 'media';
}

function LibrariesPage() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        const response = await fetch('/libraries');
        if (!response.ok) {
          throw new Error(`Failed to fetch libraries: ${response.status}`);
        }
        const data: Library[] = await response.json();
        setLibraries(
          data.filter((lib) => BROWSEABLE.has((lib.type || '').toLowerCase())),
        );
      } catch (err) {
        console.error('Error fetching libraries:', err);
        setError('Failed to load libraries. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLibraries();
  }, []);

  const handleLibraryClick = (library: Library) => {
    navigate(`/library/${library.itemId}`, {
      state: { libraryName: library.name, libraryType: library.type },
    });
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">VRChat Jellyfin</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-gray-800 animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-700 rounded w-2/3" />
              </CardHeader>
              <CardBody>
                <div className="aspect-video bg-gray-700 rounded mb-4" />
                <div className="h-4 bg-gray-700 rounded w-1/2" />
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">VRChat Jellyfin</h1>
        <div className="text-red-400 text-center" role="alert">
          <p>{error}</p>
          <Button
            className="mt-4"
            color="primary"
            onPress={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (libraries.length === 0) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">VRChat Jellyfin</h1>
        <div className="text-center py-12 text-gray-400">
          <p>No movie or TV libraries found on this Jellyfin account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">VRChat Jellyfin</h1>
      <p className="text-gray-400 mb-8">Pick a library, mint a stream URL, paste it into VRChat.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {libraries.map((library) => (
          <Card
            key={library.itemId}
            isPressable
            className="bg-gray-800 hover:bg-gray-700 transition-colors"
            onPress={() => handleLibraryClick(library)}
          >
            <CardHeader>
              <h2 className="text-xl font-semibold">{library.name || 'Unnamed Library'}</h2>
            </CardHeader>
            <CardBody>
              <div className="aspect-video bg-gray-700 rounded mb-4 overflow-hidden flex items-center justify-center">
                {library.thumbnailUrl ? (
                  <img
                    src={library.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-gray-500 text-sm">No artwork</span>
                )}
              </div>
              <p className="text-gray-300">
                Browse {libraryLabel(library.type)}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default LibrariesPage;
