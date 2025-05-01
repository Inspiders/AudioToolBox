import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Mic, MicOff, Save, Music, Bookmark, FastForward, Rewind } from 'lucide-react';
import './Audiorecorder.scss';

// Componente principal do gravador de áudio
const AudioRecorder = () => {
  // Estados para gerenciar a gravação e reprodução
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [markers, setMarkers] = useState([]);
  const [metadata, setMetadata] = useState({ title: '', author: '', vibe: '' });
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [frequencyData, setFrequencyData] = useState(new Uint8Array(128).fill(0));

  // Referências para manipulação de áudio
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);
  const sourceRef = useRef(null);

  // Inicialização do contexto de áudio
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;

    // Atalhos de teclado
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (audioURL) togglePlayback();
        else toggleRecording();
      } else if (e.key === 'm' || e.key === 'M') {
        addMarker();
      } else if (e.key === 'p' || e.key === 'P') {
        if (audioURL) togglePlayback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [audioURL, isRecording, isPlaying]);

  // Conectar áudio ao analisador quando a URL mudar
  useEffect(() => {
    if (audioURL && audioRef.current) {
      audioRef.current.onplay = () => {
        if (!sourceRef.current) {
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
        }
        visualize();
      };
    }
  }, [audioURL]);

  // Função para visualizar espectro de áudio
  const visualize = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVisualizer = () => {
      if (!isPlaying && !isRecording) {
        cancelAnimationFrame(animationFrameRef.current);
        setFrequencyData(new Uint8Array(bufferLength).fill(0));
        setAudioLevel(0);
        return;
      }

      analyserRef.current.getByteFrequencyData(dataArray);
      setFrequencyData(dataArray);

      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      setAudioLevel(average / 255);

      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    };

    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  };

  // Iniciar gravação
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      visualize();

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        saveToLocalStorage(audioBlob);
      };

      mediaRecorderRef.current.start(1000); // Dividir em blocos de 1 segundo
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      setIsRecording(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Erro ao acessar o microfone:', error);
      alert('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  };

  // Pausar gravação
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      clearInterval(timerRef.current);
      setIsPaused(true);
    }
  };

  // Retomar gravação
  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      setIsPaused(false);
    }
  };

  // Parar gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
      setIsPaused(false);
      analyserRef.current.disconnect();
    }
  };

  // Controle de reprodução
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        cancelAnimationFrame(animationFrameRef.current);
      } else {
        audioRef.current.play().catch((err) => console.error('Erro ao reproduzir:', err));
        setIsPlaying(true);
      }
    }
  };

  const updatePlaybackRate = (rate) => {
    const newRate = Math.max(0.5, Math.min(2, rate));
    setPlaybackRate(newRate);
    if (audioRef.current) audioRef.current.playbackRate = newRate;
  };

  const updatePitch = (newPitch) => {
    const newPitchValue = Math.max(0.5, Math.min(2, newPitch));
    setPitch(newPitchValue);
    if (audioRef.current && sourceRef.current) {
      // Simplificação: ajustar playbackRate para simular pitch
      audioRef.current.playbackRate = newPitchValue * playbackRate;
    }
  };

  // Adicionar marcador
  const addMarker = () => {
    if (isRecording || isPlaying) {
      const currentTime = isRecording ? recordingTime : audioRef.current.currentTime;
      setMarkers((prev) => [
        ...prev,
        {
          time: currentTime,
          label: `Beat ${prev.length + 1}`,
          id: Date.now(),
        },
      ]);
    }
  };

  // Exportar áudio
  const handleExport = () => {
    setShowMetadataModal(true);
  };

  const exportAudio = () => {
    if (!audioURL) return;

    const link = document.createElement('a');
    link.href = audioURL;
    link.download = `${metadata.title || 'audiorecorder'}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowMetadataModal(false);
  };

  // Salvar no localStorage
  const saveToLocalStorage = (blob) => {
    localStorage.setItem('audiorecorderTimestamp', Date.now().toString());
    localStorage.setItem('audiorecorderDuration', recordingTime.toString());
    localStorage.setItem('audiorecorderMarkers', JSON.stringify(markers));
  };

  // Formatar tempo
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio">
      <div className="recorder-container">
        <h1 className="app-title">AudioRecorder</h1>

        {/* Visualizador de espectro */}
        <div className="spectrum-visualizer">
          <div className="frequency-bars">
            {Array.from({ length: 32 }).map((_, i) => {
              const index = Math.floor(i * frequencyData.length / 32);
              const height = frequencyData[index] / 255;
              return (
                <div
                  key={i}
                  className="frequency-bar"
                  style={{ height: `${height * 100}%` }}
                />
              );
            })}
          </div>
          {markers.map((marker) => {
            const position = (marker.time / (recordingTime || audioRef.current?.duration || 1)) * 100;
            return (
              <div
                key={marker.id}
                className="marker-indicator"
                style={{ left: `${position}%` }}
              />
            );
          })}
        </div>

        {/* Medidor de nível */}
        <div className="level-meter">
          <div
            className="level-fill"
            style={{ width: `${audioLevel * 100}%` }}
          />
        </div>

        {/* Controles de gravação */}
        <div className="record-controls">
          {!audioURL ? (
            <>
              <button
                onClick={startRecording}
                disabled={isRecording && !isPaused}
                className={`record-button ${isRecording && !isPaused ? 'recording' : ''}`}
              >
                <Mic size={24} />
                Iniciar
              </button>
              {isRecording && (
                <>
                  <button
                    onClick={pauseRecording}
                    disabled={isPaused}
                    className="record-button"
                  >
                    <Pause size={24} />
                    Pausar
                  </button>
                  <button
                    onClick={resumeRecording}
                    disabled={!isPaused}
                    className="record-button"
                  >
                    <Play size={24} />
                    Continuar
                  </button>
                  <button
                    onClick={stopRecording}
                    className="record-button"
                  >
                    <MicOff size={24} />
                    Parar
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="playback-controls">
              <button
                onClick={() => updatePlaybackRate(playbackRate - 0.1)}
                className="speed-button"
              >
                <Rewind size={20} />
              </button>
              <button
                onClick={togglePlayback}
                className="play-button"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button
                onClick={() => updatePlaybackRate(playbackRate + 0.1)}
                className="speed-button"
              >
                <FastForward size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Informações */}
        <div className="info-grid">
          <div className="info-box">
            <div className="info-label">Duração</div>
            <div className="info-value time-value">
              {formatTime(isPlaying && audioRef.current ? audioRef.current.currentTime : recordingTime)}
            </div>
          </div>
          <div className="info-box">
            <div className="info-label">Marcadores</div>
            <div className="info-value markers-value">{markers.length}</div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="action-buttons">
          <button
            onClick={addMarker}
            disabled={!isRecording && !isPlaying}
            className={`action-button mark-button ${!isRecording && !isPlaying ? 'disabled' : ''}`}
          >
            <Bookmark size={18} className="button-icon" />
            Adicionar Marcador
          </button>
          <button
            onClick={handleExport}
            disabled={!audioURL}
            className={`action-button export-button ${!audioURL ? 'disabled' : ''}`}
          >
            <Save size={18} className="button-icon" />
            Exportar Áudio
          </button>
        </div>

        {/* Controles de áudio */}
        {audioURL && (
          <div className="audio-settings">
            <audio ref={audioRef} src={audioURL} className="hidden-audio" />
            <div className="slider-grid">
              <div className="slider-container">
                <label className="slider-label">Velocidade: {playbackRate.toFixed(1)}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={playbackRate}
                  onChange={(e) => updatePlaybackRate(parseFloat(e.target.value))}
                  className="slider-control"
                />
              </div>
              <div className="slider-container">
                <label className="slider-label">Pitch: {pitch.toFixed(1)}</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={pitch}
                  onChange={(e) => updatePitch(parseFloat(e.target.value))}
                  className="slider-control"
                />
              </div>
            </div>
          </div>
        )}

        {/* Lista de marcadores */}
        {markers.length > 0 && (
          <div className="markers-container">
            <h3 className="section-title">Marcadores</h3>
            <div className="markers-list">
              {markers.map((marker) => (
                <div key={marker.id} className="marker-item">
                  <span className="marker-label">{marker.label}</span>
                  <span className="marker-time">{formatTime(marker.time)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de metadados */}
      {showMetadataModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Metadados do Áudio</h2>
            <div className="modal-fields">
              <div className="form-group">
                <label className="form-label">Título</label>
                <input
                  type="text"
                  value={metadata.title}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  className="form-input"
                  placeholder="Nome do áudio"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Autor</label>
                <input
                  type="text"
                  value={metadata.author}
                  onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                  className="form-input"
                  placeholder="Nome do artista"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Vibe</label>
                <input
                  type="text"
                  value={metadata.vibe}
                  onChange={(e) => setMetadata({ ...metadata, vibe: e.target.value })}
                  className="form-input"
                  placeholder="Ex.: Chill, Energético, Escuro"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowMetadataModal(false)}
                className="cancel-button"
              >
                Cancelar
              </button>
              <button
                onClick={exportAudio}
                className="confirm-button"
              >
                <Music size={18} className="button-icon" />
                Exportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Atalhos de teclado */}
      <div className="keyboard-shortcuts">
        Atalhos: <span className="shortcut-key">Espaço</span> (Gravar/Play),{' '}
        <span className="shortcut-key">M</span> (Marcador),{' '}
        <span className="shortcut-key">P</span> (Play/Pause)
      </div>
    </div>
  );
};

export default AudioRecorder;