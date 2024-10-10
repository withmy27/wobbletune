/** @type {HTMLButtonElement} */
const startButton = document.getElementById('startButton');

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('showWave');

/** @type {CanvasRenderingContext2D} */
const canvasContext = canvas.getContext('2d');

/** @type {HTMLParagraphElement} */
const freqView = document.getElementById('showFreq');

/** @type {HTMLParagraphElement} */
const noteView = document.getElementById('showNote');

/** @type {HTMLParagraphElement} */
const decibelView = document.getElementById('showDecibel');

/** @type {AudioContext} */
let audioContext;

const fftSize = 4096;

// 버튼 클릭으로 오디오 시작
startButton.addEventListener('click', async () => {
	if (audioContext) return; // 이미 있으면 버튼 비활성화

	audioContext = new window.AudioContext();

	const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch((err) => {
		console.error('Error accessing audio stream:', err);
	});
	const source = audioContext.createMediaStreamSource(stream);

	/** @type {AnalyserNode} */
	const analyser = audioContext.createAnalyser();
	analyser.fftSize = fftSize;

	const bufferLength = analyser.frequencyBinCount;
	const frequencyData = new Uint8Array(bufferLength);
	const timeDomainData = new Uint8Array(analyser.fftSize);
	// const frequencyData = new Float32Array(bufferLength);
	// const timeDomainData = new Float32Array(analyser.fftSize);

	console.log('bufferLength' + bufferLength);
	console.log('analyser.fftSize' + analyser.fftSize);

	source.connect(analyser);

	let x, y, v, sliceWidth;

	function draw() {
		analyser.getByteTimeDomainData(timeDomainData);
		// analyser.getFloatTimeDomainData(timeDomainData);

		// Canvas 초기화
		canvasContext.clearRect(0, 0, canvas.width, canvas.height);

		// 기준선
		canvasContext.lineWidth = 1;
		canvasContext.strokeStyle = '#646262';
		canvasContext.beginPath();
		canvasContext.moveTo(0, canvas.height / 2);
		canvasContext.lineTo(canvas.width, canvas.height / 2);
		canvasContext.stroke();

		// 파형 그리기
		canvasContext.strokeStyle = '#1e1b1b';
		canvasContext.beginPath();

		sliceWidth = canvas.width / bufferLength;
		x = canvas.width;

		for (let i = 0; i < bufferLength; i++) {
			v = timeDomainData[i] / 128.0; // 값 범위 조정 (128을 중심으로)
			y = (v * canvas.height) / 2;

			if (i === 0) {
				canvasContext.moveTo(x, y);
			} else {
				canvasContext.lineTo(x, y);
			}

			x -= sliceWidth;
		}

		canvasContext.lineTo(0, canvas.height / 2);
		canvasContext.stroke();

		// requestAnimationFrame(draw);
	}

	let maxIndex, i, nyquist, frequency, sum;

	// 주파수를 분석하는 함수
	function analyze() {
		analyser.getByteFrequencyData(frequencyData);
		// analyser.getFloatFrequencyData(frequencyData);

		maxIndex = 0;
		// sum = 0;
		for (i = 0; i < bufferLength; i++) {
			if (frequencyData[i] > frequencyData[maxIndex]) maxIndex = i;
			// sum += frequencyData[i];
			// sum += Math.pow((amplitude = (frequencyData[i] - 128) / 128.0), 2);
		}

		nyquist = audioContext.sampleRate / 2;
		frequency = (maxIndex * nyquist) / bufferLength;

		freqView.textContent = frequency + ' Hz';
		const pitchData = pitch(frequency);
		noteView.innerHTML = `${pitchData.note ?? ''}<sup>${pitchData.octave ?? ''}</sup>`;
		// decibelView.textContent = 20 * Math.log10(Math.sqrt(sum / bufferLength) / bufferLength / 20e-6) + 'dB';

		// requestAnimationFrame(analyze);
	}

	const intvCallback = () => {
		draw();
		analyze();
	};

	setInterval(intvCallback, 100);
});

const c0 = 16.3515978313;
const log2_c0 = Math.log2(c0);
const a4 = 440;
const pitchRatio = 1.05946309436; // 2^(1/12)
const notes = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

let k, n, note, octave, accuracy;

/**
 * @param {number} freq
 * @returns {{note: string, octave: number, freq: number, accuracy: number}}
 */
function pitch(freq) {
	if (freq <= 0) return null;

	// f = c0 * 2^(k/12)
	k = (Math.log2(freq) - log2_c0) * 12;
	n = Math.round(k);

	note = notes[n % 12];
	octave = Math.floor(n / 12);
	accuracy = k / n;

	return { note, octave, freq, accuracy };
}
