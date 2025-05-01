import React from 'react';
import AudioRecorder from './components/audiorecorder/Audiorecorder';

function App() {
  return (
    <div className="audio">
      <h1>AudioToolBox</h1>
      <AudioRecorder /> {/* <-- Aqui está o que faltava */}
    </div>
  );
}

export default App;
