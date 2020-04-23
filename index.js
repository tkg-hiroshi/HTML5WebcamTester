
// Camera facing mode = flip mode
const FACING_MODE_ENVIRONMENT = "environment";
const FACING_MODE_USER = "user";
let gCurrentCameraFacingMode = FACING_MODE_ENVIRONMENT;

// Flip camera
const switchCamera = () => {

  if( gCurrentCameraFacingMode === FACING_MODE_ENVIRONMENT ){
    gCurrentCameraFacingMode = FACING_MODE_USER;
  }else{
    gCurrentCameraFacingMode = FACING_MODE_ENVIRONMENT;
  }
  startStreamingVideo();

}

// Flip Cmera
const filpCameraElem = document.getElementById( "flipCameraImage" );
filpCameraElem.addEventListener( "mouseover", async ev => {
  filpCameraElem.style.opacity = 0.7;
});
filpCameraElem.addEventListener( "mouseout", async ev => {
  filpCameraElem.style.opacity = 0.3;
});
filpCameraElem.addEventListener( "click", async ev => {
  switchCamera();
});



// Video element
const video = document.querySelector( "#video" );

// On Streaming
const startStreamingVideo = () => {
      
  if( navigator.mediaDevices.getUserMedia ){

    navigator.mediaDevices.getUserMedia( 
      { video: { facingMode: gCurrentCameraFacingMode, width: 1280, height: 720} }
    ).then( async ( stream ) => {
      await sleep(1000);
      video.srcObject = stream;
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      const settings = videoTrack.getSettings();

      const input = document.querySelector('input[type="range"]');

      console.log(capabilities);

      if (!('zoom' in capabilities)) {
        document.getElementById('logOut').innerHTML += 'Zoom is not supported by ' + videoTrack.label + "<br>";
        console.log('Zoom is not supported by ' + videoTrack.label);
      }else{
        document.getElementById('logOut').innerHTML 
        += 'Zoom is supported by ' + videoTrack.label 
        + 'min:' + capabilities.zoom.min
        + 'max:' + capabilities.zoom.max + "<br>";
        console.log('Zoom is supported by ' + videoTrack.label);
        videoTrack.applyConstraints({advanced: [ {zoom: 2} ]});
        // Map zoom to a slider element.
        input.min = capabilities.zoom.min;
        input.max = capabilities.zoom.max;
        input.step = capabilities.zoom.step;
        input.value = settings.zoom;
        input.oninput = function(event) {
          videoTrack.applyConstraints({advanced: [ {zoom: event.target.value} ]});
        }
        input.hidden = false;
      }
    } );
    
  }

}
function sleep(ms = 0) {
  return new Promise(r => setTimeout(r, ms));
}

startStreamingVideo();

// Capture image from video streaming after loading the video stream.
// Reference => https://qiita.com/iwaimagic/items/1d16a721b36f04e91aed
let gIsLoaded = false;
video.onloadedmetadata = () => {

  if( !gIsLoaded ){
    gIsLoaded = true;

    const btCapture = document.getElementById( 'btCapture' );

    btCapture.addEventListener( 'click', () => {
      
      // Capture: draw to hidden canvas
      const hiddenCanvas = document.getElementById( 'hiddenCanvas' );
      hiddenCanvas.width = video.videoWidth;
      hiddenCanvas.height = video.videoHeight;
      const ctx = hiddenCanvas.getContext('2d');
      ctx.drawImage( video, 0, 0, hiddenCanvas.width, hiddenCanvas.height );

      // Download: load DataURL and convert to png
      const link = document.getElementById( 'hiddenLink' );
      link.href = hiddenCanvas.toDataURL();
      
      // document.getElementById('hiddenCanvas').src = hiddenCanvas.toDataURL();
      link.download = getYYYYMMDD_hhmmss( true, false ) + ".png";
      link.click();

    });

    btCapture.disabled = false;

    const INTERVAL = 200;
    setInterval( decodeQR, INTERVAL );

  }

}


// QR decoding
let previousDecodedData = undefined;
const decodeQR = () => {

  // Capture: draw to hidden canvas
  const hiddenCanvas = document.getElementById( 'hiddenCanvasForQR' );
  hiddenCanvas.width = video.videoWidth;
  hiddenCanvas.height = video.videoHeight;
  const hctx = hiddenCanvas.getContext('2d');
  hctx.drawImage( video, 0, 0, hiddenCanvas.width, hiddenCanvas.height );
  const hiddenImageData = hctx.getImageData( 0, hiddenCanvas.height / 2 - hiddenCanvas.width / 2, hiddenCanvas.width / 2, hiddenCanvas.height / 2);

  // Capture: draw to hidden canvas
  const canvas = document.getElementById( 'canvasForQR' );
  const ctx = canvas.getContext('2d');


  // Trimming
  // const range = 200;
  // let imageData = ctx.createImageData(range, range);
  // for(let i = 0; i < imageData.height; i++){
  //   for(let j = 0; j < imageData.width; j++){
  //     const tar_index = (j + i*imageData.width) * 4;
  //     const res_i = i + (hiddenImageData.height - imageData.height) / 2
  //     const res_j = j + (hiddenImageData.width - imageData.width) / 2
  //     const res_index = (res_j + res_i*hiddenImageData.width) * 4;
  //     imageData.data[tar_index + 0] = hiddenImageData.data[res_index + 0];
  //     imageData.data[tar_index + 1] = hiddenImageData.data[res_index + 1];
  //     imageData.data[tar_index + 2] = hiddenImageData.data[res_index + 2];
  //     imageData.data[tar_index + 3] = hiddenImageData.data[res_index + 3];

  //   }
  // }
  let imageData = hiddenImageData;

  // Picture Effect for QR
  for(let i = 0; i < imageData.height; i++){
    for(let j = 0; j < imageData.width; j++){
      const index = (j + i*imageData.width) * 4;
      pictureEffect(imageData, index, 'none');
    }
  }

  ctx.putImageData(imageData, 0, 0)
  // ctx.drawImage( imageData, 0, 0, imageData.width, imageData.height );

  // Decode: 
  const code = jsQR( imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "dontInvert",
  } );
  
  if ( code ) {
    // console.log( code );

    if( document.getElementById( 'cbIgnoreSameData' ).checked &&
        ( code.data === previousDecodedData ) ){
        // Ignore
    }else{

      const decodedDataText = document.getElementById( 'decodedData' );
      if( previousDecodedData === undefined ){
        decodedDataText.value = '';
      }

      decodedDataText.value = getYYYYMMDD_hhmmss( true, true ) 
                                + ': ' + code.data + '\n' + decodedDataText.value;

    }

    previousDecodedData = code.data;

  } else {
    // console.log( 'no data' );
  }

}

function pictureEffect(imageData, index, code){

  if(code === 'gray'){
    const v = 0.30 * imageData.data[index] + 0.59 * imageData.data[index + 1] + 0.11 * imageData.data[index + 2];
    imageData.data[index] = v;
    imageData.data[index + 1] = v;
    imageData.data[index + 2] = v;
  }else if (code === '2val'){
    const v = 0.30 * imageData.data[index] + 0.59 * imageData.data[index + 1] + 0.11 * imageData.data[index + 2];
    if(v > 100){
      imageData.data[index] = 255;
      imageData.data[index + 1] = 255;
      imageData.data[index + 2] = 255;
    }else{
      imageData.data[index] = 0;
      imageData.data[index + 1] = 0;
      imageData.data[index + 2] = 0;
    }
  }else if(code === 'bright'){
    const corr = 15;
    if(imageData.data[index] + corr > 255){
      imageData.data[index] = 255;
    }else{
      imageData.data[index] += corr;
    }
    index++;
    if(imageData.data[index] + corr > 255){
      imageData.data[index] = 255;
    }else{
      imageData.data[index] += corr;
    }
    index++;
    if(imageData.data[index] + corr > 255){
      imageData.data[index] = 255;
    }else{
      imageData.data[index] += corr;
    }
  }
}

// function pictureEffect(imageData, index, corr){
//   if((imageData.data[index] + corr) > 255){
//     return 255;
//   }else{
//     return imageData.data[index] + corr;
//   }
// }

// Reference => https://gist.github.com/froop/962669
const getYYYYMMDD_hhmmss = ( isNeedUS, isNeedmsec ) => {

  const now = new Date();
  let retVal = '';

  // YYMMDD
  retVal += now.getFullYear();
  retVal += padZero2Digit( now.getMonth() + 1 );
  retVal += padZero2Digit( now.getDate() );
  
  if( isNeedUS ){ retVal += '_'; }
  
  // hhmmss
  retVal += padZero2Digit( now.getHours() );
  retVal += padZero2Digit( now.getMinutes() );
  retVal += padZero2Digit( now.getSeconds() );

  // .sss (msec)
  if( isNeedmsec ){
    retVal += '.' + padZero3Digit( now.getMilliseconds() );
  }

  return retVal;

}

// Zero padding function 2 digits
const padZero2Digit = ( num ) => {
  return ( num < 10 ? "0" : "" ) + num;
}

// Zero padding function 3 digits
const padZero3Digit = ( num ) => {
  if( num > 99 ){
    return "" + num;
  }else if( num > 9 ){
    return "0" + num;
  }else{
    return "00" + num;
  }
}


// Show readme
document.getElementById( "btShowReadMe" ).addEventListener( "click", async ev => {
  window.open('https://github.com/tetunori/HTML5WebcamTester/blob/master/README.md','_blank');
});

