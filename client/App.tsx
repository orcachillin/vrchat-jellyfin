import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LibrariesPage from './pages/LibrariesPage';
import LibraryPage from './pages/LibraryPage';
import TVShowPage from './pages/TVShowPage';
import SeasonPage from './pages/SeasonPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Routes>
        <Route path="/" element={<LibrariesPage />} />
        <Route path="/library/:libraryId" element={<LibraryPage />} />
        <Route path="/tvshow/:showId" element={<TVShowPage />} />
        <Route path="/season/:seasonId" element={<SeasonPage />} />
      </Routes>
    </div>
  );
}

export default App;
