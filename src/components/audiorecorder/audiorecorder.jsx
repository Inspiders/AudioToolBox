import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RefreshCcw, Save, Volume2 } from 'lucide-react';
import './AudioRecorder.scss';
const { ipcRenderer } = window.require('electron');

const AudioRecorder = () => {
  // Estados para controlar o gravador
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [visualizationType, setVisualizationType] = useState('waveform'); // waveform ou frequency
  const [selectedFormat, setSelectedFormat] = useState('wav');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [fileName, setFileName] = useState('recording');

  // Refs para elementos e objetos
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // Inicializar o analisador de áudio e visualização
  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        
        // Configurar analisador
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.8;
        
        if (!isRecording && !audioUrl) {
          drawEmptyCanvas();
        }
      } catch (error) {
        console.error('Erro ao inicializar áudio:', error);
      }
    };

    initAudio();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Desenhar canvas vazio quando não há áudio
  const drawEmptyCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Linha de base
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.strokeStyle = '#6c7086';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  // Iniciar a gravação
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Conectar stream ao analisador para visualização
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        
        // Limpar timer quando gravação parar
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
      
      // Iniciar visualização
      visualizeAudio();
      
      // Iniciar gravação
      mediaRecorderRef.current.start(10);
      setIsRecording(true);
      setIsPaused(false);
      
      // Iniciar contagem de tempo
      startTimer();
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
    }
  };

  // Iniciar timer para duração da gravação
  const startTimer = () => {
    setRecordingDuration(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      setRecordingDuration(Math.floor(elapsedTime / 1000));
    }, 1000);
  };

  // Pausar gravação
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  // Parar gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Parar as faixas do MediaStream
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Limpar timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Parar visualização
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  // Resetar gravação
  const resetRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl('');
    setRecordingDuration(0);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    setIsPlaying(false);
    drawEmptyCanvas();
  };

  // Reproduzir áudio gravado
  const playRecording = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
        visualizeRecordedAudio();
      }
    }
  };

  // Preparar para salvar
  const prepareToSave = () => {
    if (audioBlob) {
      setShowSaveModal(true);
    }
  };

  // Salvar gravação
  const saveRecording = () => {
    if (audioBlob) {
      // Solicitar electron para salvar o arquivo
      const reader = new FileReader();
      reader.readAsArrayBuffer(audioBlob);
      reader.onloadend = () => {
        const buffer = reader.result;
        
        ipcRenderer.send('save-audio', {
          buffer: buffer,
          format: selectedFormat,
          fileName: fileName || 'recording'
        });
      };
      
      setShowSaveModal(false);
    }
  };

  // Visualizar áudio durante gravação
  const visualizeAudio = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Limpar canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, width, height);
    
    // Escolher tipo de visualização
    if (visualizationType === 'waveform') {
      // Visualização de forma de onda
      const bufferLength = analyserRef.current.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteTimeDomainData(dataArray);
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = isPaused ? '#f9e2af' : '#f38ba8';
      ctx.beginPath();
      
      const sliceWidth = width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * height / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();
    } else {
      // Visualização de frequência (FFT)
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const barWidth = width / bufferLength * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 255 * height;
        
        // Gradiente baseado na frequência
        const hue = i / bufferLength * 360;
        ctx.fillStyle = isPaused ? '#f9e2af' : `hsl(${hue}, 100%, 50%)`;
        
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
        
        if (x > width) break;
      }
    }
    
    // Continuar animação se estiver gravando
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(visualizeAudio);
    }
  };

  // Visualizar áudio durante reprodução
  const visualizeRecordedAudio = async () => {
    if (!audioRef.current || !audioContextRef.current || !analyserRef.current) return;
    
    // Criar source do elemento de áudio e conectar ao analisador
    const source = audioContextRef.current.createMediaElementSource(audioRef.current);
    source.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);
    
    const updateVisualizer = () => {
      visualizeAudio();
      
      if (audioRef.current && !audioRef.current.paused) {
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      } else {
        setIsPlaying(false);
        cancelAnimationFrame(animationFrameRef.current);
        drawEmptyCanvas();
      }
    };
    
    updateVisualizer();
  };

  // Formatar tempo de duração
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handler para evento de fim de reprodução
  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="audio-recorder">
      <h1> AudioToolBox </h1>
      
      <div className="visualization-container">
        <canvas ref={canvasRef} width={800} height={200}></canvas>
        
        <div className="visualization-controls">
          <button 
            className={`visualization-btn ${visualizationType === 'waveform' ? 'active' : ''}`} 
            onClick={() => setVisualizationType('waveform')}
          >
            Forma de Onda
          </button>
          <button 
            className={`visualization-btn ${visualizationType === 'frequency' ? 'active' : ''}`} 
            onClick={() => setVisualizationType('frequency')}
          >
            Espectro de Frequência
          </button>
        </div>
      </div>
      
      <div className="duration-display">
        {formatDuration(recordingDuration)}
      </div>
      
      <div className="controls">
        <button 
          className={`control-btn start ${isRecording && !isPaused ? 'active' : ''}`} 
          onClick={startRecording} 
          disabled={isRecording}
        >
          <Play size={24} />
          <span>Iniciar</span>
        </button>
        
        <button 
          className={`control-btn pause ${isPaused ? 'active' : ''}`} 
          onClick={pauseRecording} 
          disabled={!isRecording}
        >
          <Pause size={24} />
          <span>Pausar</span>
        </button>
        
        <button 
          className="control-btn stop" 
          onClick={stopRecording} 
          disabled={!isRecording}
        >
          <Square size={24} />
          <span>Parar</span>
        </button>
        
        <button 
          className={`control-btn play ${isPlaying ? 'active' : ''}`} 
          onClick={playRecording} 
          disabled={!audioUrl}
        >
          <Volume2 size={24} />
          <span>Ouvir</span>
        </button>
        
        <button 
          className="control-btn reset" 
          onClick={resetRecording}
        >
          <RefreshCcw size={24} />
          <span>Regravar</span>
        </button>
        
        <button 
          className="control-btn save" 
          onClick={prepareToSave} 
          disabled={!audioBlob}
        >
          <Save size={24} />
          <span>Salvar</span>
        </button>
      </div>
      
      {/* Player de áudio invisível para reprodução */}
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        onEnded={handleAudioEnded}
        style={{ display: 'none' }} 
      />
      
      {/* Modal para salvar */}
      {showSaveModal && (
        <div className="save-modal">
          <div className="modal-content">
            <h3>Salvar Gravação</h3>
            
            <div className="input-group">
              <label htmlFor="fileName">Nome do arquivo:</label>
              <input 
                type="text" 
                id="fileName" 
                value={fileName} 
                onChange={(e) => setFileName(e.target.value)} 
              />
            </div>
            
            <div className="format-selector">
              <div className="format-label">Formato:</div>
              <div className="format-options">
                <label className="format-option">
                  <input 
                    type="radio" 
                    name="format" 
                    value="wav" 
                    checked={selectedFormat === 'wav'} 
                    onChange={() => setSelectedFormat('wav')} 
                  />
                  <span>WAV</span>
                </label>
                
                <label className="format-option">
                  <input 
                    type="radio" 
                    name="format" 
                    value="mp3" 
                    checked={selectedFormat === 'mp3'} 
                    onChange={() => setSelectedFormat('mp3')} 
                  />
                  <span>MP3</span>
                </label>
                
                <label className="format-option disabled">
                  <input 
                    type="radio" 
                    name="format" 
                    value="midi" 
                    disabled 
                  />
                  <span>MIDI</span>
                </label>
              </div>
              
              {selectedFormat === 'midi' && (
                <div className="format-info">
                  MIDI não é um formato de gravação de áudio, mas sim de dados musicais digitais.
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button 
                className="modal-btn cancel" 
                onClick={() => setShowSaveModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="modal-btn save" 
                onClick={saveRecording}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Info sobre MIDI */}
      <div className="midi-info">
        <p>
          <strong>Nota:</strong> MIDI não é um formato de gravação de áudio, 
          mas sim um protocolo de dados musicais digitais que armazena informações sobre notas, 
          duração, volume, etc., não o som real capturado pelo microfone.
        </p>
      </div>
    </div>
  );
};

export default AudioRecorder;