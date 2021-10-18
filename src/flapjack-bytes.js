import axios from 'axios';
import GenotypeCanvas from './genotypecanvas';
import OverviewCanvas from './OverviewCanvas';
import CanvasController from './canvascontroller';
import GenotypeImporter from './GenotypeImporter';
import NucleotideColorScheme from './color/NucleotideColorScheme';
import MapImporter from './MapImporter';
import DataSet from './DataSet';
import ImportingOrderLineSort from './sort/ImportingOrderLineSort'

const defaultLineSort = new ImportingOrderLineSort();

export default function GenotypeRenderer() {
  const genotypeRenderer = {};
  let genotypeImporter;

  // Variables for referring to the genotype canvas
  let genotypeCanvas;
  let overviewCanvas;
  // TODO: need to investigate a proper clean way to implement this controller
  // functionality
  // eslint-disable-next-line no-unused-vars
  let canvasController;

  // Genotype import progress bar
  let progressBar;
  let progressBarLabel;
  let progressBarBackground;

  const boxSize = 16;

  let colorScheme;

  let genomeMap;
  let dataSet;

  function sendEvent(eventName, domParent) {
    // TODO: Invesitgate using older event emitting code for IE support
    const canvasHolder = document.getElementById(domParent.slice(1));

    // Create the event.
    const event = new Event(eventName);

    canvasHolder.dispatchEvent(event);
  }

  function zoom(size) {
    const newPosition = genotypeCanvas.zoom(size, colorScheme);
    overviewCanvas.moveToPosition(newPosition.marker, newPosition.germplasm, genotypeCanvas.visibilityWindow());
  }

  function setChromosome(chromosomeIndex) {
    canvasController.setChromosome(chromosomeIndex);
  }

  function clearParent(domParent) {
    const canvasHolder = document.getElementById(domParent.slice(1));
    while (canvasHolder.firstChild){
      canvasHolder.removeChild(canvasHolder.firstChild);
    }
  }

  function createRendererComponents(domParent, widthValue, height, overviewWidthValue, overviewHeight, minGenotypeAutoWidth, minOverviewAutoWidth, showProgress) {
    // Canvas
    if (minGenotypeAutoWidth === undefined) minGenotypeAutoWidth = 0;
    if (minOverviewAutoWidth === undefined) minOverviewAutoWidth = 0;

    const canvasHolder = document.getElementById(domParent.slice(1));
    
    const computedStyles = window.getComputedStyle(canvasHolder);
    const autoWidth = canvasHolder.clientWidth - parseInt(computedStyles.paddingLeft) - parseInt(computedStyles.paddingRight);
    const width = (widthValue === null) ? Math.max(autoWidth, minGenotypeAutoWidth) : widthValue;
    let overviewWidth = (overviewWidthValue === null) ? Math.max(autoWidth, minOverviewAutoWidth) : overviewWidthValue;

    // Controls
    const controlDiv = document.createElement('div');
    controlDiv.id = 'zoom-holder';
    const controlCol = document.createElement('div');
    controlCol.classList.add('col');
    const formControlDiv = document.createElement('div');
    formControlDiv.classList.add('form-group');

    const controlFieldSet = document.createElement('fieldset');
    controlFieldSet.classList.add('bytes-fieldset');

    const controlLegend = document.createElement('legend');
    const controlLegendText = document.createTextNode('Controls');
    controlLegend.appendChild(controlLegendText);

    // Chromosome
    const chromosomeLabel = document.createElement('label');
    chromosomeLabel.setAttribute('for', 'chromosomeSelect')
    chromosomeLabel.innerHTML = 'Chromosome: ';

    const chromosomeSelect = document.createElement('select');
    chromosomeSelect.id = 'chromosomeSelect';
    chromosomeSelect.addEventListener('change', (event) => {
      setChromosome(event.target.selectedIndex);
    });

    const chromosomeContainer = document.createElement('div');
    chromosomeContainer.append(chromosomeLabel);
    chromosomeContainer.append(chromosomeSelect);

    // Zoom
    const zoomLabel = document.createElement('label');
    zoomLabel.setAttribute('for', 'zoom-control');
    zoomLabel.innerHTML = 'Zoom:';

    const range = document.createElement('input');
    range.id = 'zoom-control';
    range.setAttribute('type', 'range');
    range.min = 2;
    range.max = 64;
    range.value = 16;

    const zoomContainer = document.createElement('div');
    zoomContainer.append(zoomLabel);
    zoomContainer.append(range);

    range.addEventListener('change', () => {
      zoom(range.value);
    });

    range.addEventListener('input', () => {
      zoom(range.value);
    });

    controlFieldSet.appendChild(controlLegend);
    controlFieldSet.appendChild(chromosomeContainer);
    controlFieldSet.appendChild(zoomContainer);
    canvasHolder.appendChild(controlFieldSet);

    if (showProgress){
      // Progress bar
      progressBarBackground = document.createElement("div");
      progressBarBackground.style.width = width + "px";
      progressBarBackground.style.backgroundColor = "grey";
      progressBarBackground.style.position = "relative";

      progressBar = document.createElement("div");
      progressBar.style.width = "1%";
      progressBar.style.height = "30px";
      progressBar.style.backgroundColor = "cyan";

      const labelContainer = document.createElement("div");
      labelContainer.style.position = "absolute";
      labelContainer.style.display = "inline";
      labelContainer.style.top = "0px";
      labelContainer.style.left = "15px";
      labelContainer.style.height = "30px";
      labelContainer.style.lineHeight = "30px";

      progressBarLabel = document.createTextNode("");
      labelContainer.appendChild(progressBarLabel);

      progressBarBackground.appendChild(progressBar);
      progressBarBackground.appendChild(labelContainer);
      canvasHolder.append(progressBarBackground);
    }

    genotypeCanvas = new GenotypeCanvas(width, height, boxSize, defaultLineSort);
    canvasHolder.append(genotypeCanvas.canvas);

    if (!overviewWidth) overviewWidth = width;
    if (!overviewHeight) overviewHeight = 200;

    overviewCanvas = new OverviewCanvas(overviewWidth, overviewHeight);
    canvasHolder.append(overviewCanvas.canvas);

    // Form
    const form = document.createElement('div');
    const formRow = document.createElement('div');
    formRow.classList.add('row');

    const colorFieldSet = createColorSchemeFieldset();
    const sortFieldSet = createSortFieldSet();
    const exportFieldSet = createExportFieldSet();

    formRow.appendChild(colorFieldSet);
    formRow.appendChild(sortFieldSet);
    formRow.appendChild(exportFieldSet);
    form.appendChild(formRow);
    controlDiv.appendChild(form);
    
    canvasHolder.appendChild(controlDiv);

    addStyleSheet();

    canvasController = new CanvasController(canvasHolder, genotypeCanvas, overviewCanvas, widthValue === null, overviewWidthValue === null, minGenotypeAutoWidth, minOverviewAutoWidth);
  }

  function addRadioButton(name, id, text, checked, parent, subcontrol) {
    const formCheck = document.createElement('div');
    formCheck.classList.add('form-check');
    const radio = document.createElement('input');
    radio.setAttribute('type', 'radio');
    radio.name = name;
    radio.id = id;
    radio.checked = checked;
    radio.classList.add('form-check-input');

    const radioLabel = document.createElement('label');
    radioLabel.htmlFor = id;
    radioLabel.classList.add('form-check-label');
    const labelText = document.createTextNode(text + " ");
    radioLabel.appendChild(labelText);

    formCheck.appendChild(radio);
    formCheck.appendChild(radioLabel);
    if (subcontrol) formCheck.appendChild(subcontrol);
    parent.appendChild(formCheck);
  }

  function addCSSRule(sheet, selector, rules, index) {
    if ('insertRule' in sheet) {
      sheet.insertRule(selector + '{' + rules + '}', index);
    } else if ('addRule' in sheet) {
      sheet.addRule(selector, rules, index);
    }
  }

  function addStyleSheet() {
    let sheet = (function() {
      // Create the <style> tag
      let style = document.createElement("style");

      // WebKit hack :(
      style.appendChild(document.createTextNode(""));

      // Add the <style> element to the page
      document.head.appendChild(style);

      return style.sheet;
    }());

    addCSSRule(sheet, '.bytes-fieldset > legend', 'border-style: none; border-width: 0; font-size: 14px; line-height: 20px; margin-bottom: 0; width: auto; padding: 0 10px; border: 1px solid #e0e0e0;');
    addCSSRule(sheet, '.bytes-fieldset', 'border: 1px solid #e0e0e0; padding: 10px;');
    // addCSSRule(sheet, 'input', 'margin: .4rem;');
  }

  function createColorSchemeFieldset() {
    const formCol = document.createElement('div');
    formCol.classList.add('col');

    const formGroup = document.createElement('div');
    formGroup.classList.add('form-group');

    const fieldset = document.createElement('fieldset');
    fieldset.classList.add('bytes-fieldset');

    const legend = document.createElement('legend');
    const legendText = document.createTextNode('Color Schemes');
    legend.appendChild(legendText);

    const lineSelect = document.createElement('select');
    lineSelect.id = 'colorLineSelect';
    lineSelect.disabled = true;

    const radioCol = document.createElement('div');
    radioCol.classList.add('col');
    addRadioButton('selectedScheme', 'nucleotideScheme', 'Nucleotide', true, radioCol);
    addRadioButton('selectedScheme', 'similarityScheme', 'Similarity to line', false, radioCol, lineSelect);

    fieldset.appendChild(legend);
    fieldset.appendChild(radioCol);
    formGroup.appendChild(fieldset);

    formCol.appendChild(formGroup);

    return formCol;
  }

  function createSortFieldSet() {
    const formCol = document.createElement('div');
    formCol.classList.add('col');

    const formGroup = document.createElement('div');
    formGroup.classList.add('form-group');

    const fieldset = document.createElement('fieldset');
    fieldset.classList.add('bytes-fieldset');

    const legend = document.createElement('legend');
    const legendText = document.createTextNode('Sort lines');
    legend.appendChild(legendText);

    const lineSelect = document.createElement('select');
    lineSelect.id = 'sortLineSelect';
    lineSelect.disabled = true;

    const radioCol = document.createElement('div');
    radioCol.classList.add('col');
    addRadioButton('selectedSort', 'importingOrderSort', 'By importing order', true, radioCol);
    addRadioButton('selectedSort', 'alphabeticSort', 'Alphabetically', false, radioCol);
    addRadioButton('selectedSort', 'similaritySort', 'By similarity to line', false, radioCol, lineSelect);

    fieldset.appendChild(legend);
    fieldset.appendChild(radioCol);
    formGroup.appendChild(fieldset);

    formCol.appendChild(formGroup);
    return formCol;
  }

  function createExportFieldSet() {
    const formCol = document.createElement('div');
    formCol.classList.add('col');

    const formGroup = document.createElement('div');
    formGroup.classList.add('form-group');

    const fieldset = document.createElement('fieldset');
    fieldset.classList.add('bytes-fieldset');

    const legend = document.createElement('legend');
    const legendText = document.createTextNode('Export');
    legend.appendChild(legendText);

    const exportViewButton = document.createElement('button')
    const exportViewText = document.createTextNode('Export view');
    exportViewButton.appendChild(exportViewText);

    exportViewButton.addEventListener('click', function(e) {
      const dataURL = genotypeCanvas.toDataURL('image/png');
      if (dataURL){  // Export succeeded
        const element = document.createElement('a');
        element.setAttribute('href', dataURL);
        element.setAttribute('download', genotypeCanvas.exportName() + '.png');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }
    });

    const exportOverviewButton = document.createElement('button');
    const exportOverviewText = document.createTextNode('Export overview');
    exportOverviewButton.appendChild(exportOverviewText);

    exportOverviewButton.addEventListener('click', function(e) {
      const dataURL = overviewCanvas.toDataURL('image/png');
      if (dataURL){  // Export succeeded
        const element = document.createElement('a');
        element.setAttribute('href', dataURL);
        element.setAttribute('download', overviewCanvas.exportName() + '.png');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }
    });

    fieldset.appendChild(legend);
    fieldset.appendChild(exportViewButton);
    fieldset.appendChild(exportOverviewButton);
    formGroup.appendChild(fieldset);

    formCol.appendChild(formGroup);
    return formCol;
  }

  function setProgressBarLabel(newLabel) {
    progressBarLabel.data = newLabel;
  }

  function setAdvancement(ratio) {
    progressBar.style.width = Math.floor(100 * ratio) + "%";
  }

  function removeAdvancement() {
    progressBarBackground.remove();
  }

  function processMarkerPositionsCall(client, url, params, markerpositions = []) {
    return client.get(url, params)
      .then((response) => {
        const { currentPage, totalPages } = response.data.metadata.pagination;

        const newData = response.data.result.data;
        markerpositions.push(...newData.map(m => ({
          name: m.variantName,
          chromosome: m.linkageGroupName,
          position: m.position,
        })));

        if (currentPage < totalPages - 1) {
          const nextPage = currentPage + 1;
          const newParams = { params: { page: nextPage } };
          return processMarkerPositionsCall(client, url, newParams, markerpositions);
        }
        return markerpositions;
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.log(error);
      });
  }

  function processVariantSetCall(client, url, params, variantSetCalls = []) {
    if (params === undefined) params = {};
    return client.get(url, params)
      .then((response) => {
        const { nextPageToken } = response.data.metadata.pagination;
        const newData = response.data.result.data;
        variantSetCalls.push(...newData.map(calls => ({
          lineName: calls.callSetName,
          markerName: calls.variantName,
          allele: calls.genotype.values[0],
        })));
        if (nextPageToken) {
          const newParams = { params: { pageToken: nextPageToken } };
          return processVariantSetCall(client, url, newParams, variantSetCalls);
        }
        return variantSetCalls;
      }).catch((error) => {
        // eslint-disable-next-line no-console
        console.log(error);
      });
  }

  genotypeRenderer.renderGenotypesBrapi = function renderGenotypesBrapi(
    domParent,
    width,
    height,
    server,
    matrixId,
    mapId,
    authToken,
    overviewWidth,
    overviewHeight,
    minGenotypeAutoWidth,
    minOverviewAutoWidth
  ) {
    clearParent(domParent)
    createRendererComponents(domParent, width, height, overviewWidth, overviewHeight, minGenotypeAutoWidth, minOverviewAutoWidth, false);
    let germplasmData;

    const client = axios.create({ baseURL: server });
    client.defaults.headers.common.Authorization = `Bearer ${authToken}`;

    if (mapId !== null) {
      // TODO: GOBii don't have the markerpositions call implemented yet so I
      // can't load map data
      processMarkerPositionsCall(client, `/markerpositions?mapDbId=${mapId}`)
        .then((markerpositions) => {
          const mapImporter = new MapImporter();
          genomeMap = mapImporter.parseMarkerpositions(markerpositions);

          processVariantSetCall(client, `/variantsets/${matrixId}/calls`)
            .then((variantSetCalls) => {
              genotypeImporter = new GenotypeImporter(genomeMap);

              if (genomeMap === undefined) {
                genomeMap = genotypeImporter.createFakeMapFromVariantSets(variantSetCalls);
              }

              germplasmData = genotypeImporter.parseVariantSetCalls(variantSetCalls);
              const { stateTable } = genotypeImporter;

              dataSet = new DataSet(genomeMap, germplasmData, stateTable);
              colorScheme = new NucleotideColorScheme(dataSet);

              populateLineSelect();
              populateChromosomeSelect();

              canvasController.init(dataSet, colorScheme);

              // Tells the dom parent that Flapjack has finished loading. Allows spinners
              // or similar to be disabled
              sendEvent('FlapjackFinished', domParent);
            })
            .catch((error) => {
              sendEvent('FlapjackError', domParent);
              // eslint-disable-next-line no-console
              console.log(error);
            });
        })
        .catch((error) => {
          sendEvent('FlapjackError', domParent);
          // eslint-disable-next-line no-console
          console.log(error);
        });
    } else {
      processVariantSetCall(client, `/variantsets/${matrixId}/calls`)
        .then((variantSetCalls) => {
          genotypeImporter = new GenotypeImporter(genomeMap);

          if (genomeMap === undefined) {
            genomeMap = genotypeImporter.createFakeMapFromVariantSets(variantSetCalls);
          }

          germplasmData = genotypeImporter.parseVariantSetCalls(variantSetCalls);
          const { stateTable } = genotypeImporter;

          dataSet = new DataSet(genomeMap, germplasmData, stateTable);
          colorScheme = new NucleotideColorScheme(dataSet);

          populateLineSelect();
          populateChromosomeSelect();

          canvasController.init(dataSet, colorScheme);

          // Tells the dom parent that Flapjack has finished loading. Allows spinners
          // or similar to be disabled
          sendEvent('FlapjackFinished', domParent);
        })
        .catch((error) => {
          sendEvent('FlapjackError', domParent);
          // eslint-disable-next-line no-console
          console.log(error);
        });
    }
    return genotypeRenderer;
  };

  genotypeRenderer.renderGenotypesUrl = function renderGenotypesUrl(
    domParent,
    width,
    height,
    mapFileURL,
    genotypeFileURL,
    authToken,
    overviewWidth,
    overviewHeight,
    minGenotypeAutoWidth,
    minOverviewAutoWidth
  ) {
    clearParent(domParent);
    createRendererComponents(domParent, width, height, overviewWidth, overviewHeight, minGenotypeAutoWidth, minOverviewAutoWidth, true);

    let mapFile;
    let genotypeFile;
    let germplasmData;
    let genotypePromise;

    setProgressBarLabel("Downloading the genome map...");
    setAdvancement(0);

    let mapPromise = axios.get(mapFileURL, {
      headers: { 'Content-Type': 'text/plain' },
      onDownloadProgress: function (progressEvent){
        if (progressEvent.lengthComputable)
          setAdvancement(progressEvent.loaded / progressEvent.total);
      }
    }).then((response) => {
      mapFile = response.data;
    }).catch((error) => {
      console.error(error);
    });

    mapPromise = mapPromise.then(function (){
      setProgressBarLabel("Downloading the genotypes...");
      setAdvancement(0);

      genotypePromise = axios.get(genotypeFileURL, {
        headers: { 'Content-Type': 'text/plain' },
        onDownloadProgress: function (progressEvent){
          if (progressEvent.lengthComputable)
            setAdvancement(progressEvent.loaded / progressEvent.total);
        }
      }).then((response) => {
        genotypeFile = response.data;
      }).catch((error) => {
        console.error(error);
      });

      genotypePromise = genotypePromise.then(function (){
        setAdvancement(0);
        setProgressBarLabel("Processing the genome map...")

        if (mapFile !== undefined) {
          const mapImporter = new MapImporter();
          genomeMap = mapImporter.parseFile(mapFile);
        }

        setProgressBarLabel("Processing the genotypes...");
        genotypeImporter = new GenotypeImporter(genomeMap);

        if (genomeMap === undefined) {
          genomeMap = genotypeImporter.createFakeMap(genotypeFile);
        }

        genotypeImporter.parseFile(genotypeFile, setAdvancement, removeAdvancement).then(function (germplasmList) {
          germplasmData = germplasmList;
          const { stateTable } = genotypeImporter;

          dataSet = new DataSet(genomeMap, germplasmData, stateTable);
          colorScheme = new NucleotideColorScheme(dataSet);

          populateLineSelect();
          populateChromosomeSelect();

          canvasController.init(dataSet, colorScheme);

          // Tells the dom parent that Flapjack has finished loading. Allows spinners
          // or similar to be disabled
          sendEvent('FlapjackFinished', domParent);
        });
      }).catch((error) => {
        sendEvent('FlapjackError', domParent);
        // eslint-disable-next-line no-console
        console.log(error);
      });
    });

    return genotypeRenderer;
  };

  function loadFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => {
        reader.abort();
        reject(new DOMException('Problem parsing input file'));
      };

      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsText(file);
    });
  }

  function populateLineSelect() {
    const colorLineSelect = document.getElementById('colorLineSelect');
    const sortLineSelect = document.getElementById('sortLineSelect');

    let optList = dataSet.germplasmList.slice();  // Shallow copy
    optList.sort((a, b) => (a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)));  // Alphabetic sort
    optList.forEach(germplasm => {
      const opt = document.createElement('option');
      opt.value = germplasm.name;
      opt.text = germplasm.name;
      colorLineSelect.add(opt);
      sortLineSelect.add(opt.cloneNode(true));
    });
  }

  function populateChromosomeSelect() {
    const chromosomeSelect = document.getElementById('chromosomeSelect');

    dataSet.genomeMap.chromosomes.forEach((chromosome, index) => {
      const opt = document.createElement('option');
      opt.value = index;
      opt.text = chromosome.name;
      opt.selected = true;
      chromosomeSelect.add(opt);
    });

    chromosomeSelect.selectedIndex = 0;
  }

  genotypeRenderer.renderGenotypesFile = function renderGenotypesFile(
    domParent,
    width,
    height,
    mapFileDom,
    genotypeFileDom,
    overviewWidth,
    overviewHeight,
    minGenotypeAutoWidth,
    minOverviewAutoWidth
  ) {
    clearParent(domParent);
    createRendererComponents(domParent, width, height, overviewWidth, overviewHeight, minGenotypeAutoWidth, minOverviewAutoWidth, true);
    // let qtls = [];
    let germplasmData;

    setProgressBarLabel("Loading file contents...");

    const mapFile = document.getElementById(mapFileDom.slice(1)).files[0];
    let mapPromise = loadFromFile(mapFile);
    // const qtlPromise = loadFromFile(qtlFileDom);
    const genotypeFile = document.getElementById(genotypeFileDom.slice(1)).files[0];
    let genotypePromise = loadFromFile(genotypeFile);

    // Load map data
    mapPromise = mapPromise.then((result) => {
      const mapImporter = new MapImporter();
      genomeMap = mapImporter.parseFile(result);
    }).catch(reason => {
      console.error(reason);
      genomeMap = undefined;
    });

    // // Then QTL data
    // qtlPromise.then((result) => {
    //   const qtlImporter = new QtlImporter();
    //   qtlImporter.parseFile(result);
    //   qtls = qtlImporter.qtls;
    // });

    // Then genotype data
    // Must be executed after the map file has been parsed *and* the genotype file has been read
    Promise.all([mapPromise, genotypePromise]).then((results) => {
      let result = results[1];
      genotypeImporter = new GenotypeImporter(genomeMap);

      if (genomeMap === undefined) {
        genomeMap = genotypeImporter.createFakeMap(result);
      }

      setProgressBarLabel("Processing genotypes...");
      setAdvancement(0);

      genotypeImporter.parseFile(result, setAdvancement, removeAdvancement).then(function (germplasmList){
        germplasmData = germplasmList;
        const { stateTable } = genotypeImporter;

        dataSet = new DataSet(genomeMap, germplasmData, stateTable);
        colorScheme = new NucleotideColorScheme(dataSet);

        populateLineSelect();
        populateChromosomeSelect();

        canvasController.init(dataSet, colorScheme);
      });
    });

    return genotypeRenderer;
  };

  genotypeRenderer.getRenderingProgressPercentage = function getRenderingProgressPercentage() {
    return genotypeImporter == null ? -1 : genotypeImporter.getImportProgressPercentage();
  };

  return genotypeRenderer;
}