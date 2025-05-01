import React from 'react';
import AudioRecorder from './components/audiorecorder/AudioRecorder.jsx';
import './global.scss'; // Verifique se o caminho está correto


const App = () => {
  return (
    <div>
      <h1>Aplicativo de Áudio</h1>
      <AudioRecorder />
    </div>
  );
};

export default App;
