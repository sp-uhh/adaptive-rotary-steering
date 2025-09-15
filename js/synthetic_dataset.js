let syncedAudio = null;
const STORAGE_DIR = 'https://www2.informatik.uni-hamburg.de/sp/audio/publications/icassp2026-adaptive-rotary-steering'

export async function renderSyntheticDatasetPane() {
  syncedAudio = null;
  await pauseAllMedia();

  const leftDynamic = document.getElementById('left-dynamic');
  leftDynamic.innerHTML = `
  <h3> Synthetic Dataset </h3>
  <p class="block-text"> We create a synthetic dataset to enable analysis with paired ground speech signals and trajectories. 
  The dataset consists of reverberant three-speaker mixtures spatialized in first order Ambisonics format with reverberation times between 200ms and 500ms.
  We use the LibriSpeech corpus [Panayotov'15] and pair utterances according to Libri3Mix [Cosentino'20].
  The movement of the speakers is modeled via randomized, sinusoidal trajectories from by Diaz et al. [Diaz'20], which are able to generate a wide range of diverse motion patterns.
  </p>
  <p class="block-text">
    <label for="exampleSelect">Choose example index:</label>
    <select id="exampleSelect">
    </select>
    </p>
    <br><br>
    <div class="media-row">
      <video id="myVideo" width="320" controls>
        <source id="videoSource" src="${STORAGE_DIR}/data/SinusoidLibri2Mix/example_0/trajectory.mp4" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    </div>
  `;

  const NUM_EXAMPLES = 10;
  const NUM_SPEAKERS = 3;
  const SSF = 'McNet';
  const TST = 'SELDnet';
  const EXP_TYPES = [
      'input', 
      'target', 
      `${SSF.toLowerCase().replace(/-/g, '_')}-strong`, 
      `${SSF.toLowerCase().replace(/-/g, '_')}-weak`, 
      `${SSF.toLowerCase().replace(/-/g, '_')}-${TST.toLowerCase()}-weak`, 
      `${SSF.toLowerCase().replace(/-/g, '_')}-${TST.toLowerCase()}-weak-ar-spatial`,
      `${SSF.toLowerCase().replace(/-/g, '_')}-weak-ar-spectral`, 
      `${SSF.toLowerCase().replace(/-/g, '_')}-${TST.toLowerCase()}-weak-ar-spatial-spectral`
  ];

  const EXP_CONFIG = [
    ['-', '-', '-', '-'],
    ['Oracle', '-', '-', '-'],
    [SSF, 'Oracle', '\u2718', '\u2718'],
    [SSF, '-', '\u2718', '\u2718'],
    [SSF, TST, '\u2718', '\u2718'],
    [SSF, TST, '\u2714', '\u2718'],
    [SSF, '-', '\u2718', '\u2714'],
    [SSF, TST, '\u2714', '\u2714'],
  ];

  const TRACKING_TYPES = [
    `${SSF.toLowerCase().replace(/-/g, '_')}-${TST.toLowerCase()}-weak`, 
    `${SSF.toLowerCase().replace(/-/g, '_')}-${TST.toLowerCase()}-weak-ar-spatial`,
    `${SSF.toLowerCase().replace(/-/g, '_')}-${TST.toLowerCase()}-weak-ar-spatial-spectral`
  ];

  const blankSpacer = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

  const IMG_HEIGHT = 180;
  const IMG_WIDTH = 320;
  const TABLE_WIDTH = 250;
  const tickSize = '14px';

  const rightPane = document.getElementById('right-pane');
  rightPane.innerHTML = `
    <div class="right-content">
      <h3>Target speaker tracking</h3>
      <div class="results-grid" id="trackingGrid"></div>
      <div class="spacer"></div>
      <h3>Target speaker extraction</h3>
      <div class="results-grid" id="resultsGrid"></div>
    </div>
  `;

  const select = document.getElementById('exampleSelect');
  for (let i = 0; i < 10; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = i;
      select.appendChild(option);
    }
  const idx = select && select.value !== "" ? select.value : 0;
  const videoSource = document.getElementById('videoSource');
  const trackingGrid = document.getElementById("trackingGrid");
  const resultsGrid = document.getElementById("resultsGrid");
  // const resultsTable = document.getElementById("resultsTable")

  function updateAll() {
      let idx = select && select.value !== "" ? select.value : 0;

  // Tracking examples table
  trackingGrid.innerHTML = '';

  // Sticky Audio titles
  let trackingRow = document.createElement('div');
  trackingRow.className = 'grid-header-row';
  const trackingTitles = [
    "Pipeline", 
    ["Azimuth", "\\( \\theta_t \\)"], 
    ["Elevation", "\\( \\phi_t \\)"]
  ];

  const trackingConfig = [
    [SSF, TST, "\u2718", "\u2718"],
    [SSF, TST, "\u2714", "\u2718"],
    [SSF, TST, "\u2714", "\u2714"],
  ];

  for (const title of trackingTitles) {
    let headerCell = document.createElement('div');
    headerCell.className = 'grid-header-cell';

    if (Array.isArray(title)) {
      // Use a span for each part
      let spanText = document.createElement('span');
      spanText.textContent = title[0] + " ";
      let spanMath = document.createElement('span');
      spanMath.innerHTML = title[1];
      headerCell.appendChild(spanText);
      headerCell.appendChild(document.createTextNode("\u00A0"));
      headerCell.appendChild(spanMath);
    } else {
      headerCell.innerHTML = title;
    }

    trackingRow.appendChild(headerCell);
  }
  trackingGrid.appendChild(trackingRow);

  // Let MathJax process new math in the DOM
  MathJax.typeset();

  // table content
  // TRACKING_TYPES.forEach(type => {
  for (let tracking_idx=0; tracking_idx<TRACKING_TYPES.length; tracking_idx++) {
    let type = TRACKING_TYPES[tracking_idx];

    let title = document.createElement('div');
    title.className = 'sticky-header-row';

      // Create a row div
      let row = document.createElement('div');
      row.className = 'exp-row';

      // Add table
      let table = document.createElement('table');
      table.className = "metric-table";
      let header = document.createElement('tr');
      ["SSF", "TST", "AR-TST", "AR-SSF", "Speaker", "ACC\n\u2191", "MAE\n\u2193"].forEach(metric => {
        let th = document.createElement('th');
        th.innerText = metric;
        header.appendChild(th);
      });
      table.appendChild(header);

      // Create the 4 spanning headers
      let headerRow = document.createElement('tr');
      trackingConfig[tracking_idx].forEach(config => {
        let th = document.createElement('td');
        th.rowSpan = NUM_SPEAKERS+1;         // Span all rows below
        th.innerText = config;
        if (config === '\u2714') {
          th.style.color = 'green';
          th.style.fontSize = tickSize;
        } else if (config === '\u2718') {
          th.style.color = 'red';
          th.style.fontSize = tickSize;
        }
        headerRow.appendChild(th);
      });
      table.append(headerRow);

      // Decide color based on spk
      let colors = ["#1f77b4", "#ff7f0e", "#2ca02c"]; // tab:blue, tab:orange, tab:green
      // Use spk-1 since arrays are 0-indexed
      
      // Get metrics
      let col = document.createElement('div');
      col.className = 'exp-column';
      fetch(`data/SinusoidLibri${NUM_SPEAKERS}Mix/example_${idx}/${type}_tracking.json`)
      .then(response => response.json())
      .then(data => {
        const accList = data.acc;
        const maeList = data.mae;
        for (let i = 0; i < NUM_SPEAKERS; i++) {
          let valuesRow1 = document.createElement('tr');


          let dot = document.createElement('span');
          dot.style.display = 'inline-block';
          dot.style.width = '12px';
          dot.style.height = '12px';
          dot.style.borderRadius = '50%';
          dot.style.marginRight = '8px';
          dot.style.backgroundColor = colors[i] || "#bbbbbb"; // fallback color
          let dot_td = document.createElement('td');
          dot_td.appendChild(dot)
          valuesRow1.appendChild(dot_td);
          
          let acc = document.createElement('td');
          acc.innerText = accList[i];
          valuesRow1.appendChild(acc);

          let mae = document.createElement('td');
          mae.innerText = maeList[i];
          valuesRow1.appendChild(mae);
          table.appendChild(valuesRow1);
          synchronizeRowHeights();
        }

        col.appendChild(table);
      })
      .catch(error => {
        console.error('Error fetching JSON:', error);
      });
      row.appendChild(col)

      // azimuth
      let az_col = document.createElement('div');
      az_col.className = 'exp-column';
      let az_img = document.createElement('img');
      az_img.width = IMG_WIDTH;
      az_img.height = IMG_HEIGHT;
      az_img.src = `${STORAGE_DIR}/data/SinusoidLibri${NUM_SPEAKERS}Mix/example_${idx}/${type}_azimuth.svg`;
      az_img.alt = `${type}`;
      az_col.appendChild(az_img);
      row.appendChild(az_col)

      // elevation
      let el_col = document.createElement('div');
      el_col.className = 'exp-column';
      let el_img = document.createElement('img');
      el_img.width = IMG_WIDTH;
      el_img.height = IMG_HEIGHT;
      el_img.src = `${STORAGE_DIR}/data/SinusoidLibri${NUM_SPEAKERS}Mix/example_${idx}/${type}_elevation.svg`;
      el_img.alt = `${type}`;
      el_col.appendChild(el_img);
      row.appendChild(el_col)

      trackingGrid.appendChild(row);
  };

  // });


  // Audio examples table
  resultsGrid.innerHTML = '';

  // Sticky Audio titles
  let headerRow = document.createElement('div');
  headerRow.className = 'grid-header-row';

  let headerCell = document.createElement('div');
  headerCell.className = 'grid-header-cell';
  headerCell.appendChild(document.createTextNode('Pipeline'));
  headerRow.appendChild(headerCell);

  for(let spk=1; spk<=NUM_SPEAKERS; spk++) {
    let headerCell = document.createElement('div');
    headerCell.className = 'grid-header-cell';

    // let title = document.createElement('h4');
    // title.className = 'speaker-title';
    let dot = document.createElement('span');
    dot.style.display = 'inline-block';
    dot.style.width = '12px';
    dot.style.height = '12px';
    dot.style.borderRadius = '50%';
    dot.style.marginRight = '8px';

    // Decide color based on spk
    let colors = ["#1f77b4", "#ff7f0e", "#2ca02c"]; // tab:blue, tab:orange, tab:green
    // Use spk-1 since arrays are 0-indexed
    dot.style.backgroundColor = colors[spk-1] || "#bbbbbb"; // fallback color
    let pair = document.createElement('span');
    pair.style.display = 'inline-flex';
    pair.style.alignItems = 'center';

    pair.appendChild(dot);
    pair.appendChild(document.createTextNode(`Speaker ${spk}`));
    headerCell.appendChild(pair);

    headerRow.appendChild(headerCell);
  }
  resultsGrid.appendChild(headerRow);

  // table content
  for(let type_idx=0; type_idx<EXP_TYPES.length; type_idx++) {
    let type = EXP_TYPES[type_idx]

    let title = document.createElement('div');
    title.className = 'sticky-header-row';

      // Create a row div
      let row = document.createElement('div');
      row.className = 'exp-row';
      
      // Add experiment columns for each speaker
      for(let spk=0; spk<=NUM_SPEAKERS; spk++) {
          let col = document.createElement('div');
          col.className = 'exp-column';

        // Create outer container for image and controls
        let container = document.createElement('div');
        container.className = 'spectrogram-with-controls';

        let controlsRow = document.createElement('div');
        controlsRow.className = 'spectrogram-controls-row';

          if (spk === 0){

            let img = document.createElement('img');
            img.width = IMG_WIDTH;
            img.height = IMG_HEIGHT;
            img.alt = `typespk{type}_spktypes​pk{spk}`;
            img.onload = img.onerror = function() {
              synchronizeRowHeights();
            };
            img.onerror = function() {
              this.onerror = null;  // Prevent infinite loop
              this.src = blankSpacer;
              synchronizeRowHeights();
            };
            img.src = `${STORAGE_DIR}/data/SinusoidLibri${NUM_SPEAKERS}Mix/example_${idx}/${type}_spk1.svg`;
            img.style.opacity = '0';
            container.appendChild(img);

            // config table
            let table = document.createElement('table');
            table.className = "metric-table";
            table.style.display = "table";  
            let header = document.createElement('tr');
            ["SSF", "TST", "AR-TST", "AR-SSF"].forEach(metric => {
              let th = document.createElement('th');
              th.innerText = metric;
              header.appendChild(th);
            });
            table.appendChild(header);
            let config = document.createElement('tr');
            EXP_CONFIG[type_idx].forEach(metric => {
              let th = document.createElement('td');
              th.innerText = metric;
              if (metric === '\u2714') {
                th.style.color = 'green';
                th.style.fontSize = tickSize;
              } else if (metric === '\u2718') {
                th.style.color = 'red';
                th.style.fontSize = tickSize;
              } // else leave as default (black)
              config.appendChild(th);
            });
            table.appendChild(config);
            controlsRow.appendChild(table);
            container.appendChild(controlsRow);
          } else {

            // spectrogram
        let img = document.createElement('img');
        img.width = IMG_WIDTH;
        img.height = IMG_HEIGHT;
        img.alt = `typespk{type}_spktypes​pk{spk}`;
        img.onload = img.onerror = function() {
          synchronizeRowHeights();
        };
        img.onerror = function() {
          this.onerror = null;  // Prevent infinite loop
          this.src = blankSpacer;
          synchronizeRowHeights();
        };
        img.src = `${STORAGE_DIR}/data/SinusoidLibri${NUM_SPEAKERS}Mix/example_${idx}/${type}_spk${spk}.svg`;
        container.appendChild(img);

          // Create audio element (hidden)
          let audio = document.createElement('audio');
          audio.src = `${STORAGE_DIR}/data/SinusoidLibri${NUM_SPEAKERS}Mix/example_${idx}/${type}_spk${spk}.wav`;

          // Create play/pause button
          let playBtn = document.createElement('button');
          playBtn.textContent = '▶️'; // Unicode play symbol, or use an <img> icon
          playBtn.className = 'spectrogram-play-btn';

          // Toggle play/pause on button click
          playBtn.onclick = function() {
            if (audio.paused) {
              audio.play();
              playBtn.textContent = '⏸️'; // pause symbol
            } else {
              audio.pause();
              playBtn.textContent = '▶️';
            }
          };

          // Optional: update button state if audio ends
          audio.onended = function() {
            playBtn.textContent = '▶️';
          };

          controlsRow.appendChild(playBtn);

          // Get metrics
          if (type !== 'target') {
            fetch(`data/SinusoidLibri${NUM_SPEAKERS}Mix/example_${idx}/${type}_spk${spk}.json`)
            .then(response => response.json())
            .then(data => {
              const sisdrValue = data.sisdr;
              const pesqValue = data.pesq;
              const estoiValue = data.estoi;
              // console.log("SI-SDR [dB]", sisdrValue, "PESQ", pesqValue, "ESTOI", estoiValue);
              
              let table = document.createElement('table');
              table.className = "metric-table";

              let headerRow = document.createElement('tr');
              // ["SI-SDR [dB]", "PESQ [1-5]", "ESTOI [%]"].forEach(metric => {
              ["SI-SDR", "PESQ", "ESTOI"].forEach(metric => {
                let th = document.createElement('th');
                // You can either concatenate the unicode character or use createTextNode/appending
                th.innerText = metric + "\u2191";
                headerRow.appendChild(th);
              });
              table.appendChild(headerRow);
              // Create second row: metric values (SI-SDR, PESQ, STOI)
              let valuesRow1 = document.createElement('tr');
              [sisdrValue, pesqValue, estoiValue].forEach(metric => {
                let td = document.createElement('td');
                td.innerText = metric;
                valuesRow1.appendChild(td);
              });
              table.appendChild(valuesRow1);

              controlsRow.appendChild(table);
              synchronizeRowHeights();
            })
            .catch(error => {
              console.error('Error fetching JSON:', error);
            });
          } else {
            let table = document.createElement('table');
            table.className = "metric-table";
          
            let headerRow = document.createElement('tr');
            ["SI-SDR", "PESQ", "ESTOI"].forEach(metric => {
              let th = document.createElement('th');
              th.innerText = metric + "\u2191";
              headerRow.appendChild(th);
            });
            table.appendChild(headerRow);
          
            let valuesRow1 = document.createElement('tr');
            ["∞", "5.0", "100.0"].forEach(metric => {
              let td = document.createElement('td');
              td.innerText = metric;
              valuesRow1.appendChild(td);
            });
            table.appendChild(valuesRow1);
            controlsRow.appendChild(table);
          }

          container.appendChild(controlsRow);
          container.appendChild(audio);

          }
          col.appendChild(container);

          row.appendChild(col);
      }

      resultsGrid.appendChild(row);
      let newVideoSrc = `${STORAGE_DIR}/data/SinusoidLibri${NUM_SPEAKERS}Mix/example_${idx}/trajectory.mp4`;
      videoSource.src = newVideoSrc;
      videoSource.parentNode.load();

    };

    let videoElem = document.getElementById('myVideo');
let audioElems = Array.from(resultsGrid.querySelectorAll('audio'));

// Remove controls to make video unplayable on its own
videoElem.removeAttribute('controls');

// Event guards to block user-triggered play/seeking (as in previous answer)
videoElem.onplay = null;
videoElem.onseeking = null;
videoElem.onclick = null;
videoElem.onkeydown = null;

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
videoElem.addEventListener('keydown', e => {
  e.preventDefault();
  return false;
});

// Remove previous syncedAudio for this dataset
syncedAudio = null;

audioElems.forEach(audio => {
  audio.addEventListener('play', () => {
    // Pause all other audios first
    audioElems.forEach(a => { if (a !== audio && !a.paused) a.pause(); });

    // Wait for pause to actually finish (give browser an event cycle)
    setTimeout(() => {
      syncedAudio = audio;

      // Sync video to current audio and play
      videoElem.currentTime = audio.currentTime;
      if (videoElem.paused) videoElem.play();

      // (Optionally update visual indicators here)
    }, 30);
  });

  audio.addEventListener('pause', () => {
    if (!videoElem.paused) videoElem.pause();
  });

  audio.addEventListener('seeked', () => {
    videoElem.currentTime = audio.currentTime;
  });
});
  // });

  }

    window.addEventListener('load', synchronizeRowHeights);
      setTimeout(synchronizeRowHeights, 500); // Extra after metrics fill in

  function synchronizeRowHeights() {
    // For each exp-row
    document.querySelectorAll('.exp-row').forEach(function(row){
      // Collect direct exp-column children
      const columns = Array.from(row.children).filter(el => el.classList.contains('exp-column'));
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