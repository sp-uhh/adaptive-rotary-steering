let syncedAudio = null;
const STORAGE_DIR = 'https://www2.informatik.uni-hamburg.de/sp/audio/publications/icassp2026-adaptive-rotary-steering'

export async function renderRecordedDatasetPane() {
  syncedAudio = null;
  await pauseAllMedia();

  const leftDynamic = document.getElementById('left-dynamic');
  leftDynamic.innerHTML = `
  <h3> Recorded Dataset </h3>
  <p class="block-text"> To test generalizablity and robustness in real-world scenarios, we include recordings with human speakers for evaluation.
  We use a first order Ambisonics microphone array, which we place centered in a room with a reverberation time of approximately 350ms.
  The speakers read out segments from the Rainbow Passage [Fairbanks'60] while randomly moving in the frontal plane of the array.
  We split the Rainbow Passage into 3 segments of roughly equal length and permute these among all three speakers, yielding 3 recordings of about 30\,s each in total.
  </p>
  <p class="block-text">
    <label for="recSelect">Choose recording:</label>
    <select id="recSelect">
    </select>
  </p>
    <br><br>
    <table class="metric-table" id="recordedMetrics"></table>
  `;

  const NUM_RECORDINGS = 3;
  const arrowPositions = {
    1: { left: '18%', top: '8%' },
    2: { left: '46%', top: '7%' },
    3: { left: '75%', top: '7%' }
  };
  const NUM_SPEAKERS = 3;
  const SPK_COLORS = ["#1f77b4", "#ff7f0e", "#2ca02c"];
  const SSF_TYPES = [
    'McNet', 'SpatialNet'
  ];
  const TST = 'SELDnet';
  const EXP_TYPES = [ 
      `${TST.toLowerCase()}-weak`, 
      `${TST.toLowerCase()}-weak-ar-spatial-spectral`
  ];

  const EXP_CONFIG = [
    [TST, '\u2718', '\u2718'],
    [TST, '\u2714', '\u2714'],
  ];

  const tickSize = '18px';


  const rightPane = document.getElementById('right-pane');
  rightPane.innerHTML = `
    <div class="right-content">
    <div class="video-container"; style="position:relative; display:inline-block;">
    <video id="myVideo" width="854" height="480" controls>
    <source id="videoSource" src="${STORAGE_DIR}/data/AudioLab/recording_1/segmented.mp4" type="video/mp4">
    Your browser does not support the video tag.
    </video>
    <div id="arrowOverlay"
       style="
         position:absolute; 
         left:200px; 
         top:100px; 
         width:0; 
         height:0;
         z-index:2;
         pointer-events:none;">
    <!-- Example: SVG arrow -->
    <svg width="70" height="70">
      <polygon points="0,0 60,0 30,60" fill="none" />
    </svg>
  </div>
  <div id="videoLabel"
  style="
    position: absolute;
    left: 10%;
    bottom: 25px;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    padding: 2px 10px;
    border-radius: 5px;
    font-size: 20px;
    z-index:3;">
Unprocessed
</div>
</div>
      <div class="recorded-grid" id="recordedGrid"></div>
    </div>
  `;

  const select = document.getElementById('recSelect');
  for (let i = 1; i <= NUM_RECORDINGS; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = i;
      select.appendChild(option);
    }
  const idx = select && select.value !== "" ? select.value : 1;
  const videoSource = document.getElementById('videoSource');

  function updateAll() {
      let idx = select && select.value !== "" ? select.value : 1;
      syncedAudio = null;


      // table with recorded metrics
      // --------------------------------------------------------------
      const recordedMetrics = document.getElementById('recordedMetrics')
      recordedMetrics.innerHTML = "";
      // First header row
      let header1 = document.createElement('tr');

      // "Metrics" header across SSF, TST, AR-TST, AR-SSF (4 columns)
      let thMetrics = document.createElement('th');
      thMetrics.colSpan = 4;
      thMetrics.innerText = "Metrics";
      header1.appendChild(thMetrics);

      // "NISQA ↑" across 3 columns (Speakers 1-3)
      let thNISQA = document.createElement('th');
      thNISQA.colSpan = 3;
      thNISQA.innerText = "NISQA \u2191";
      header1.appendChild(thNISQA);

      // "WER ↓" across 3 columns (Speakers 1-3)
      let thWER = document.createElement('th');
      thWER.colSpan = 3;
      thWER.innerText = "WER \u2193";
      header1.appendChild(thWER);

      recordedMetrics.appendChild(header1);

      // Second header row
      let header2 = document.createElement('tr');
      // SSF, TST, AR-TST, AR-SSF (each just 1 col, under "Metrics")
      ["SSF", "TST", "AR-TST", "AR-SSF"].forEach(metric => {
        let th = document.createElement('th');
        th.innerText = metric;
        header2.appendChild(th);
      });

      for (let j = 0; j<2; j++){
      for (let i = 0; i < NUM_SPEAKERS; i++) {
        let dot = document.createElement('span');
        dot.style.display = 'inline-block';
        dot.style.width = '12px';
        dot.style.height = '12px';
        dot.style.borderRadius = '50%';
        dot.style.marginRight = '8px';
        dot.style.backgroundColor = SPK_COLORS[i] || "#bbbbbb"; // fallback color
        let dot_td = document.createElement('td');
        dot_td.appendChild(dot)
        header2.appendChild(dot_td);
      }
      recordedMetrics.appendChild(header2);
      }     

      // metrics of noisy input
      let noisy = document.createElement('tr');
      // SSF, TST, AR-TST, AR-SSF (each just 1 col, under "Metrics")
      for (let i=0; i <= EXP_CONFIG[0].length; i++){
          let th = document.createElement('th');
          th.innerText = '-';
          noisy.appendChild(th);
      }
      fetch(`data/AudioLab/recording_${idx}/${SSF_TYPES[0].toLowerCase()}-${EXP_TYPES[0]}_results.json`)
        .then(response => response.json())
        .then(data => {
        for (let i = 0; i < NUM_SPEAKERS; i++) {
          let metricValue = document.createElement('td');
          metricValue.innerText = data['input']['nisqa'][i].toFixed(2);
          noisy.appendChild(metricValue);
        }
        for (let i = 0; i < NUM_SPEAKERS; i++) {
          let metricValue = document.createElement('td');
          metricValue.innerText = (data['input']['wer'][i] * 100).toFixed(1);
          
          noisy.appendChild(metricValue);
      }
      })
      recordedMetrics.appendChild(noisy);

      let rowPromises = [];

      for (let ssf_idx = 0; ssf_idx < SSF_TYPES.length; ssf_idx++) {
        let ssf = SSF_TYPES[ssf_idx];
        for (let type_idx = 0; type_idx < EXP_TYPES.length; type_idx++) {
          let type = EXP_TYPES[type_idx];
          let config = [ssf, ...EXP_CONFIG[type_idx]]; // to reuse below

          // Push a promise for each fetch
          rowPromises.push(
            fetch(`data/AudioLab/recording_${idx}/${ssf.toLowerCase()}-${type}_results.json`)
              .then(response => response.json())
              .then(data => {
                // Build a row (do not append yet!)
                let valuesRow = document.createElement('tr');
                config.forEach(item => {
                  let td = document.createElement('td');
                  td.innerText = item;
                  if (item === '\u2714') {
                    td.style.color = 'green';
                    td.style.fontSize = tickSize;
                  } else if (item === '\u2718') {
                    td.style.color = 'red';
                    td.style.fontSize = tickSize;
                  }
                  valuesRow.appendChild(td);
                });
                for (let i = 1; i <= NUM_SPEAKERS; i++) {
                  // Append NISQA
                  let nisqaTd = document.createElement('td');
                  nisqaTd.innerText = data[`speaker${i}`]['nisqa'].toFixed(2);
                  valuesRow.appendChild(nisqaTd);
                }
                for (let i = 1; i <= NUM_SPEAKERS; i++) {
                  // Append WER
                  let werTd = document.createElement('td');
                  werTd.innerText = (data[`speaker${i}`]['wer'] * 100).toFixed(1);
                  valuesRow.appendChild(werTd);
                }
                return valuesRow;
              })
          );
        }
      }

      // When all fetches are done, append rows in order
      Promise.all(rowPromises).then(rows => {
        rows.forEach(row => recordedMetrics.appendChild(row));
        synchronizeRowHeights();
      });

      // --------------------------------------------------------------

      // Audio examples table
      recordedGrid.innerHTML = '';

      // Sticky Audio titles
      let headerRow = document.createElement('div');
      headerRow.className = 'recorded-header-row';

      ["SSF", "TST", "AR-TST", "AR-SSF"].forEach(type => {
        let headerCell = document.createElement('div');
        headerCell.className = 'recorded-header-cell';
        headerCell.innerText = type;
        headerRow.appendChild(headerCell);
      });
      for(let spk=1; spk<=NUM_SPEAKERS; spk++) {
        let headerCell = document.createElement('div');
        headerCell.className = 'recorded-header-cell';

        // let title = document.createElement('h4');
        // title.className = 'speaker-title';
        let dot = document.createElement('span');
        dot.style.display = 'inline-block';
        dot.style.width = '12px';
        dot.style.height = '12px';
        dot.style.borderRadius = '50%';
        dot.style.marginRight = '8px';

        // Decide color based on spk
        dot.style.backgroundColor = SPK_COLORS[spk-1] || "#bbbbbb"; // fallback color
        let pair = document.createElement('span');
        pair.style.display = 'inline-flex';
        pair.style.alignItems = 'center';

        pair.appendChild(dot);
        pair.appendChild(document.createTextNode(`Speaker ${spk}`));
        headerCell.appendChild(pair);

        headerRow.appendChild(headerCell);
      }
      recordedGrid.appendChild(headerRow);

      // add noisy audio
      let row = document.createElement('div');
      row.className = 'recorded-row';
      for (let i=0; i<=EXP_CONFIG[0].length; i++) {
        let col = document.createElement('div');
        col.className = 'recorded-column';
        col.innerText = '-';
        row.appendChild(col);
      }
      for (let spk=1; spk<=NUM_SPEAKERS; spk++) {
        let col = document.createElement('div');
        col.className = 'recorded-column';
        let audio = document.createElement('audio');
        audio.src = `${STORAGE_DIR}/data/AudioLab/recording_${idx}/noisy.wav`;
        audio.controls = true;
        audio.dataset.speaker = spk;
        audio.isNoisy = true;
        col.appendChild(audio);
        row.appendChild(col);
      }
      recordedGrid.appendChild(row)

      

  // enhanced signals 
  for(let ssf_idx=0; ssf_idx<SSF_TYPES.length; ssf_idx++){
    let ssf = SSF_TYPES[ssf_idx];
  for(let type_idx=0; type_idx<EXP_TYPES.length; type_idx++) {
    let type = EXP_TYPES[type_idx]

    // fill metrics config
    let valuesRow = document.createElement('tr');
    [ssf, ...EXP_CONFIG[type_idx]].forEach(config => {
      let th = document.createElement('td');
      th.innerText = config;
      if (config === '\u2714') {
        th.style.color = 'green';
        th.style.fontSize = tickSize;
      } else if (config === '\u2718') {
        th.style.color = 'red';
        th.style.fontSize = tickSize;
      }
      valuesRow.appendChild(th);
    });

    // // collect metrics
    // fetch(`data/AudioLab/recording_${idx}/${ssf.toLowerCase()}-${type}_results.json`)
    // .then(response => response.json())
    // .then(data => {
    //   for (let i = 1; i <= NUM_SPEAKERS; i++) {
    //     // Append nisqa
    //     let nisqaTd = document.createElement('td');
    //     nisqaTd.innerText = data[`speaker${i}`]['nisqa'].toFixed(2);
    //     valuesRow.appendChild(nisqaTd);
    //   }
    //   for (let i = 1; i <= NUM_SPEAKERS; i++) {
    //     // Append wer
    //     let werTd = document.createElement('td');
    //     werTd.innerText = (data[`speaker${i}`]['wer'] * 100).toFixed(1);
    //     valuesRow.appendChild(werTd);
    //   }
    //   synchronizeRowHeights();
    //   recordedMetrics.append(valuesRow);
    // });

    let title = document.createElement('div');
    title.className = 'sticky-header-row';

      // Create a row div
      let row = document.createElement('div');
      row.className = 'recorded-row';

      // Add experiment config
      [ssf, ...EXP_CONFIG[type_idx]].forEach(metric => {
        let col = document.createElement('div');
        col.className = 'recorded-column';
        col.innerText = metric;
        if (metric === '\u2714') {
          col.style.color = 'green';
          col.style.fontSize = tickSize;
        } else if (metric === '\u2718') {
          col.style.color = 'red';
          col.style.fontSize = tickSize;
        }
        row.append(col)
      });
      
      // Add experiment columns for each speaker
      for(let spk=1; spk<=NUM_SPEAKERS; spk++) {
          let col = document.createElement('div');
          col.className = 'recorded-column';

        // Create outer container for image and controls
        let container = document.createElement('div');
        container.className = 'spectrogram-with-controls';

        let controlsRow = document.createElement('div');
        controlsRow.className = 'spectrogram-controls-row';

        // add enhanced speech
        let audio = document.createElement('audio');
        audio.src = `${STORAGE_DIR}/data/AudioLab/recording_${idx}/${ssf.toLowerCase()}-${type}_${spk}.wav`;
        audio.controls = true;
        audio.dataset.speaker = spk;
        audio.isNoisy = false;
        col.appendChild(audio);
        col.appendChild(container);

        row.appendChild(col);

        }
      recordedGrid.appendChild(row);
    };
  };
    let videoElem = document.getElementById('myVideo');
    let audioElems = Array.from(recordedGrid.querySelectorAll('audio'));

    // Remove controls to make video unplayable on its own
    videoElem.removeAttribute('controls');

    // Prevent any user-initiated play, pause, seeking
    videoElem.addEventListener('play', function(e) {
      if (!syncedAudio || syncedAudio.paused) {
        e.preventDefault();
        videoElem.pause();
      }
    });

    videoElem.addEventListener('seeking', function(e){
      if (!syncedAudio || syncedAudio.paused) {
        e.preventDefault();
        videoElem.currentTime = 0;
      }
    });

    videoElem.addEventListener('click', e => {
      e.preventDefault();
      return false;
    });

    // Optionally block keyboard controls
    videoElem.addEventListener('keydown', e => {
      e.preventDefault();
      return false;
    });

    // set arrow
    const arrow = document.getElementById('arrowOverlay');
    videoElem.ontimeupdate = function() {
      if (videoElem.currentTime <= 3) {
        arrow.style.display = 'block';
      } else {
        arrow.style.display = 'none';
      }
    };

    // Track which audio (if any) is the "currently paired" audio
    // let syncedAudio = null;

    audioElems.forEach(audio => {
      audio.addEventListener('play', () => {
        // 1. Pause all other audios immediately
        audioElems.forEach(a => { if (a !== audio && !a.paused) a.pause(); });
    
        // 2. If another audio was playing, need to wait for its 'pause' event to complete, or do the rest after a small delay.
        setTimeout(() => {
          syncedAudio = audio;
    
          // Sync video to current audio and play
          videoElem.currentTime = audio.currentTime;
          if (videoElem.paused) videoElem.play();
    
          // Video description update
          const arrow = document.getElementById('arrowOverlay');
          const label = document.getElementById('videoLabel');
          const polygon = arrow.querySelector('polygon');
          let color;
          if (audio.isNoisy) {
            color = 'none';
            label.innerText = 'Unprocessed';
          } else {
            const speakerNum = audio.dataset.speaker;
            arrow.style.left = arrowPositions[speakerNum].left;
            arrow.style.top  = arrowPositions[speakerNum].top;
            color = SPK_COLORS[speakerNum-1];
            label.innerText = 'Enhanced';
          }
          polygon.setAttribute('fill', color);
        }, 30); // 30ms is typically enough for the event loop to finish pausing others
      });
    
      audio.addEventListener('pause', () => {
        if (!videoElem.paused) videoElem.pause();
      });
    
      audio.addEventListener('seeked', () => {
        videoElem.currentTime = audio.currentTime;
      });
    });


    // When a new audio is played, update video source (if needed)
    let newVideoSrc = `${STORAGE_DIR}/data/AudioLab/recording_${idx}/segmented.mp4`;
    videoSource.src = newVideoSrc;
    videoSource.parentNode.load();
  };
  
    window.addEventListener('load', synchronizeRowHeights);
      setTimeout(synchronizeRowHeights, 500); // Extra after metrics fill in

  function synchronizeRowHeights() {
    // For each recorded-row
    document.querySelectorAll('.recorded-row').forEach(function(row){
      // Collect direct recorded-column children
      const columns = Array.from(row.children).filter(el => el.classList.contains('recorded-column'));
      // Reset heights for measurement
      columns.forEach(col => col.style.height = '');
      // Find the tallest
      const maxHeight = Math.max(...columns.map(col => col.offsetHeight));
      // Set all columns in the row to the tallest
      columns.forEach(col => col.style.height = maxHeight + "px");
    });
  }

  select.addEventListener('change', updateAll);

  updateAll();

}

async function pauseAllMedia() {
  // Pause and reset all audios
  syncedAudio = null;
  await Promise.all(Array.from(document.querySelectorAll('audio')).map(async audio => {
      // Pause returns a Promise in modern browsers
      await audio.pause();
      audio.currentTime = 0;
  }));
  // Pause and reset video if present
  const video = document.getElementById('myVideo');
  if (video) {
      await video.pause();
      video.currentTime = 0;
  }
}