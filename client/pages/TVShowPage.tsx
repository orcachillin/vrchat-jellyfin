import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardBody, Button } from '@heroui/react';

interface Season {
  itemId: string;
  name: string | null;
  index: number | null;
  thumbnailUrl: string | null;
}

function TVShowPage() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [showName, setShowName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSeasons = async () => {
      if (!showId) return;

      setLoading(true);
      setError(null);

      try {
        // First get show details
        const showResponse = await fetch(`/items/${showId}/details`);
        if (!showResponse.ok) {
          throw new Error(`Failed to fetch show details: ${showResponse.status}`);
        }
        const showData = await showResponse.json();
        setShowName(showData.name || 'Unknown Show');

        // Then get seasons
        const seasonsResponse = await fetch(`/tvshows/${showId}/seasons`);
        if (!seasonsResponse.ok) {
          throw new Error(`Failed to fetch seasons: ${seasonsResponse.status}`);
        }
        const seasonsData = await seasonsResponse.json();
        setSeasons(seasonsData);
      } catch (err) {
        console.error('Error fetching seasons:', err);
        setError('Failed to load seasons. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSeasons();
  }, [showId]);

  const handleSeasonClick = (season: Season) => {
    navigate(`/season/${season.itemId}`);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">Loading...</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i} className="bg-gray-800 animate-pulse">
              <CardBody className="aspect-video">
                <div className="h-6 bg-gray-700 rounded w-3/4 mb-2" />
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
        <div className="mb-4">
          <Button onPress={handleBackClick} variant="ghost" className="mb-4">
            ← Back
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">{showName}</h1>
        </div>
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

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <Button onPress={handleBackClick} variant="ghost" className="mb-4">
          ← Back
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{showName}</h1>
        <p className="text-gray-400">Select a season</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {seasons.map((season) => (
          <Card
            key={season.itemId}
            isPressable
            className="bg-gray-800 hover:bg-gray-700 transition-colors"
            onPress={() => handleSeasonClick(season)}
          >
            <CardBody>
              <div className="aspect-video bg-gray-700 rounded mb-4 overflow-hidden">
                {season.thumbnailUrl ? (
                  <img
                    src={season.thumbnailUrl}
                    alt={season.name || `Season ${season.index}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    No Image
                  </div>
                )}
              </div>

              <h3 className="font-semibold text-lg">
                {season.name || `Season ${season.index || 'Unknown'}`}
              </h3>
            </CardBody>
          </Card>
        ))}
      </div>

      {seasons.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No seasons found for this show.</p>
        </div>
      )}
    </div>
  );
}

export default TVShowPage;
