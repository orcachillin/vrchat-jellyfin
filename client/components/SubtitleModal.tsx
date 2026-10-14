import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Card, CardBody } from '@heroui/react';

interface Subtitle {
  index: number;
  language: string;
}

interface SubtitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  subtitles: Subtitle[];
}

function SubtitleModal({ isOpen, onClose, itemId, itemName, subtitles }: SubtitleModalProps) {
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedSubtitleIndex(null);
      setGeneratedUrl('');
      setError(null);
      setCopied(false);
    }
  }, [isOpen]);

  const getLanguageFlag = (language: string) => {
    // Map common language codes to flag emojis
    const flagMap: { [key: string]: string } = {
      'en': '🇺🇸',
      'es': '🇪🇸',
      'fr': '🇫🇷',
      'de': '🇩🇪',
      'it': '🇮🇹',
      'pt': '🇵🇹',
      'ru': '🇷🇺',
      'ja': '🇯🇵',
      'ko': '🇰🇷',
      'zh': '🇨🇳',
      'ar': '🇸🇦',
      'hi': '🇮🇳',
    };
    return flagMap[language.toLowerCase()] || '🏳️';
  };

  const handleSubtitleSelect = async (subtitleIndex: number | null) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/i/${itemId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subtitleStreamIndex: subtitleIndex,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create proxy: ${response.status}`);
      }

      const data = await response.json();
      const proxyId = data.id;
      const url = `${window.location.origin}/v/${proxyId}`;

      setGeneratedUrl(url);
      setSelectedSubtitleIndex(subtitleIndex);

      // Auto-copy to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (err) {
      console.error('Error creating proxy:', err);
      setError('Failed to generate streaming URL. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (generatedUrl && navigator.clipboard) {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>
          <h2 className="text-xl font-bold">Select Subtitles</h2>
        </ModalHeader>

        <ModalBody>
          <div className="mb-4">
            <h3 className="font-semibold mb-2">{itemName}</h3>
            <p className="text-sm text-gray-400">
              Choose subtitle track or select "No Subtitles"
            </p>
          </div>

          {!generatedUrl ? (
            <div className="space-y-3">
              {/* No subtitles option */}
              <Card
                isPressable
                className="hover:bg-gray-700 transition-colors"
                onPress={() => handleSubtitleSelect(null)}
              >
                <CardBody className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🏳️</span>
                      <span className="font-medium">No Subtitles</span>
                    </div>
                    {loading && selectedSubtitleIndex === null && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* Subtitle options */}
              {subtitles.map((subtitle) => (
                <Card
                  key={subtitle.index}
                  isPressable
                  className="hover:bg-gray-700 transition-colors"
                  onPress={() => handleSubtitleSelect(subtitle.index)}
                >
                  <CardBody className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getLanguageFlag(subtitle.language)}</span>
                        <div>
                          <span className="font-medium capitalize">
                            {subtitle.language === 'Unknown' ? 'Unknown Language' : subtitle.language}
                          </span>
                          <span className="text-sm text-gray-400 ml-2">
                            (Track {subtitle.index})
                          </span>
                        </div>
                      </div>
                      {loading && selectedSubtitleIndex === subtitle.index && (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-900/20 border border-green-600 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-400">✓</span>
                  <span className="font-medium text-green-400">
                    {copied ? 'Copied to clipboard!' : 'URL generated successfully'}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-3">
                  Use this URL in VRChat or your preferred video player:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm font-mono"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    onPress={copyToClipboard}
                    variant={copied ? "solid" : "ghost"}
                    color={copied ? "success" : "primary"}
                    size="sm"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-600 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onPress={onClose}>
            {generatedUrl ? 'Close' : 'Cancel'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default SubtitleModal;
