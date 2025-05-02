import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RefreshCcw, Save, Volume2, Sliders } from 'lucide-react';
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
  // Novos estados para controle de frequência
  const [showFrequencyControls, setShowFrequencyControls] = useState(false);
  const [minFrequency, setMinFrequency] = useState(50);
  const [maxFrequency, setMaxFrequency] = useState(2000);
  const [frequencyFilterEnabled, setFrequencyFilterEnabled] = useState(false);

  // Refs para elementos e objetos
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  // Novos refs para o filtro de frequência
  const lowPassFilterRef = useRef(null);
  const highPassFilterRef = useRef(null);
  const sourceNodeRef = useRef(null);

  // Inicializar o analisador de áudio e visualização
  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        
        // Configurar analisador
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.8;
        
        // Inicializar filtros de frequência
        lowPassFilterRef.current = audioContextRef.current.createBiquadFilter();
        lowPassFilterRef.current.type = 'lowpass';
        lowPassFilterRef.current.frequency.value = maxFrequency;
        
        highPassFilterRef.current = audioContextRef.current.createBiquadFilter();
        highPassFilterRef.current.type = 'highpass';
        highPassFilterRef.current.frequency.value = minFrequency;
        
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

  // Efeito para atualizar as frequências dos filtros quando mudarem
  useEffect(() => {
    if (lowPassFilterRef.current && highPassFilterRef.current) {
      lowPassFilterRef.current.frequency.value = maxFrequency;
      highPassFilterRef.current.frequency.value = minFrequency;
    }
  }, [minFrequency, maxFrequency]);

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

    // Se o filtro de frequência estiver ativado, desenhar indicadores
    if (frequencyFilterEnabled && visualizationType === 'frequency') {
      drawFrequencyRangeIndicators(ctx, canvas.width, canvas.height);
    }
  };

  // Desenhar indicadores de faixa de frequência
  const drawFrequencyRangeIndicators = (ctx, width, height) => {
    // Calcular posições baseadas na frequência
    // O analisador FFT geralmente cobre faixas de 0Hz até metade da taxa de amostragem (geralmente 22050Hz)
    const totalFrequencyRange = 22050;
    const minX = (minFrequency / totalFrequencyRange) * width;
    const maxX = (maxFrequency / totalFrequencyRange) * width;
    
    // Desenhar faixa selecionada como overlay semitransparente
    ctx.fillStyle = 'rgba(116, 199, 236, 0.2)'; // cor primary-color com transparência
    ctx.fillRect(minX, 0, maxX - minX, height);
    
    // Desenhar linhas delimitadoras
    ctx.beginPath();
    ctx.moveTo(minX, 0);
    ctx.lineTo(minX, height);
    ctx.strokeStyle = '#74c7ec'; // primary-color
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(maxX, 0);
    ctx.lineTo(maxX, height);
    ctx.stroke();
    
    // Adicionar rótulos de frequência
    ctx.fillStyle = '#cdd6f4'; // text-color
    ctx.font = '12px sans-serif';
    ctx.fillText(`${minFrequency}Hz`, minX + 5, 15);
    ctx.fillText(`${maxFrequency}Hz`, maxX - 50, 15);
  };

  // Iniciar a gravação
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Conectar stream ao analisador para visualização
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Configurar cadeia de áudio com filtros quando ativados
      if (frequencyFilterEnabled) {
        sourceNodeRef.current.connect(highPassFilterRef.current);
        highPassFilterRef.current.connect(lowPassFilterRef.current);
        lowPassFilterRef.current.connect(analyserRef.current);
      } else {
        sourceNodeRef.current.connect(analyserRef.current);
      }
      
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
      
      // Desconectar nós de áudio
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      
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
      
      // Calcular limites de índice para a faixa de frequência selecionada
      // quando o filtro estiver ativado
      const nyquist = audioContextRef.current.sampleRate / 2;
      const minIndex = frequencyFilterEnabled ? Math.floor(minFrequency / nyquist * bufferLength) : 0;
      const maxIndex = frequencyFilterEnabled ? Math.ceil(maxFrequency / nyquist * bufferLength) : bufferLength;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 255 * height;
        
        // Verificar se está na faixa de frequência selecionada
        const isInSelectedRange = i >= minIndex && i <= maxIndex;
        
        // Definir estilo baseado na faixa de frequência e no estado de pausa
        if (isPaused) {
          ctx.fillStyle = '#f9e2af'; // warning-color
        } else if (frequencyFilterEnabled) {
          // Gradiente baseado na frequência com opacidade reduzida para frequências fora da faixa
          const hue = i / bufferLength * 360;
          const alpha = isInSelectedRange ? 1.0 : 0.3;
          ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
        } else {
          // Gradiente padrão baseado na frequência
          const hue = i / bufferLength * 360;
          ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        }
        
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
        
        if (x > width) break;
      }
      
      // Desenhar indicadores de faixa de frequência se o filtro estiver ativo
      if (frequencyFilterEnabled) {
        drawFrequencyRangeIndicators(ctx, width, height);
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
    
    // Criar source do elemento de áudio
    const source = audioContextRef.current.createMediaElementSource(audioRef.current);
    
    // Configurar cadeia de áudio com filtros quando ativados
    if (frequencyFilterEnabled) {
      source.connect(highPassFilterRef.current);
      highPassFilterRef.current.connect(lowPassFilterRef.current);
      lowPassFilterRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    } else {
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }
    
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

  // Alternar painel de controle de frequência
  const toggleFrequencyControls = () => {
    setShowFrequencyControls(!showFrequencyControls);
  };

  // Habilitar/desabilitar filtro de frequência
  const toggleFrequencyFilter = () => {
    setFrequencyFilterEnabled(!frequencyFilterEnabled);
    
    // Se estamos desabilitando o filtro e estamos gravando,
    // precisamos reconectar os nós de áudio
    if (isRecording && sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      if (!frequencyFilterEnabled) {
        // Ativando filtro
        sourceNodeRef.current.connect(highPassFilterRef.current);
        highPassFilterRef.current.connect(lowPassFilterRef.current);
        lowPassFilterRef.current.connect(analyserRef.current);
      } else {
        // Desativando filtro
        sourceNodeRef.current.connect(analyserRef.current);
      }
    }
    
    // Redesenhar visualização
    if (!isRecording && !isPlaying) {
      drawEmptyCanvas();
    }
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
          <button 
            className={`visualization-btn ${showFrequencyControls ? 'active' : ''}`} 
            onClick={toggleFrequencyControls}
          >
            <Sliders size={16} />
            <span>Filtro de Frequência</span>
          </button>
        </div>
        
        {showFrequencyControls && (
          <div className="frequency-controls">
            <div className="frequency-filter-toggle">
              <label>
                <input 
                  type="checkbox" 
                  checked={frequencyFilterEnabled} 
                  onChange={toggleFrequencyFilter} 
                />
                <span>Ativar filtro de frequência (50Hz-2000Hz)</span>
              </label>
            </div>
            
            <div className="frequency-sliders">
              <div className="frequency-slider">
                <label>Frequência mínima: {minFrequency} Hz</label>
                <input 
                  type="range" 
                  min="20" 
                  max="1000" 
                  value={minFrequency} 
                  onChange={(e) => setMinFrequency(parseInt(e.target.value))} 
                />
              </div>
              
              <div className="frequency-slider">
                <label>Frequência máxima: {maxFrequency} Hz</label>
                <input 
                  type="range" 
                  min="1000" 
                  max="20000" 
                  value={maxFrequency} 
                  onChange={(e) => setMaxFrequency(parseInt(e.target.value))} 
                />
              </div>
            </div>
          </div>
        )}
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