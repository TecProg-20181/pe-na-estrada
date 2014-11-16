
// Load the assert.js and sinalize_patch_constants.js scripts
(function() {
  var assertScript = document.createElement('script');
  assertScript.type = 'text/javascript';
  assertScript.src = 'assert.js';
  
  var constantsScript = document.createElement('script');
  constantsScript.type = 'text/javascript';
  constantsScript.src = 'sinalize_patch_constants.js';

  document.getElementsByTagName('head')[0].appendChild(assertScript);
  document.getElementsByTagName('head')[0].appendChild(constantsScript);
})();

// Initialize the patches array as an array of arrays
function initializePatchesArray(patchesArray, quantityOfPatches){
    // Each position in 'patches[]' array is an array that will contain the steps for this patch
    var p = 0;
    for(p = 0; p < quantityOfPatches; p++){
        patchesArray[p] = new Array();
    }
}

function calculateStepsPerPatch(totalOfSteps, quantityOfPatches){

    var remainingSteps = calculateRemainingSteps(totalOfSteps, quantityOfPatches);

    var quantityOfStepsPerPatch = (totalOfSteps - remainingSteps) / quantityOfPatches;

    return quantityOfStepsPerPatch;
}

function calculateRemainingSteps(totalOfSteps, quantityOfPatches){
  
  try{
    assert(quantityOfPatches != 0, QUANTITY_OF_PATCHES_IS_ZERO);
    assert(quantityOfPatches > 0), QUANTITY_OF_PATCHES_IS_NEGATIVE;
  }
  catch(thrownError){

    switch(thrownError.message){
           case QUANTITY_OF_PATCHES_IS_ZERO:
                 quantityOfPatches = DEFAULT_QUANTITY_OF_PATCHES;
                 break;
           case QUANTITY_OF_PATCHES_IS_NEGATIVE:
                 // Do the treatment for negative numbers here
                 // Setted to DEFAULT_QUANTITY_OF_PATCHES as default
                 quantityOfPatches = DEFAULT_QUANTITY_OF_PATCHES;
                 break;
           default:
                 // Nothing to do 
    }

  }

  var remainingSteps = totalOfSteps % quantityOfPatches;

  return remainingSteps;
}

function fitRemainingStepsOnLastPatch(patches, routeAllSteps, remainingSteps){
     
     var quantityOfPatches = patches.length;
     var totalOfSteps = routeAllSteps.length;

     // Last patch position in 'patches[]' array
     var lastPatch = quantityOfPatches - 1;

     // Adding the remaining steps to the last patch
     var t = 0;
     for(t = 0; t < remainingSteps; t++){
         var routeStepsIndex = totalOfSteps - (remainingSteps - t);
         patches[lastPatch].push(routeAllSteps[routeStepsIndex]);
     }

     return patches;
}

/*
    Separate the steps from 'routeAllSteps' array equally in 'quantityOfPatches' patches.
    And then add the remaining steps to the last patch.
    param routeAllSteps - Array of google.maps.DirectionsStep objects that contains all steps of the route
    param quantityOfPatches - Quantity of patches to distribute the steps into
    return An array that contains the patches with it respective steps
 */
function distributeStepsOnPatches(routeAllSteps, quantityOfPatches){

     var totalOfSteps = routeAllSteps.length;
     var quantityOfStepsPerPatch = calculateStepsPerPatch(totalOfSteps, quantityOfPatches);
     
     var patches = [quantityOfPatches];
     initializePatchesArray(patches, quantityOfPatches);

     // Will be added at the last patch
     var remainingSteps = calculateRemainingSteps(totalOfSteps, quantityOfPatches);

     var patchIndex = 0;
     var reachPatchMaxElements = 0;
     var quantityOfStepsToFitOnPatches = totalOfSteps - remainingSteps;

     var i = 0;
     for(i = 0; i < quantityOfStepsToFitOnPatches; i++){

           var stepToPush = routeAllSteps[i];
           patches[patchIndex].push(stepToPush);
           reachPatchMaxElements++;

           if(reachPatchMaxElements === quantityOfStepsPerPatch){
               patchIndex++;
               reachPatchMaxElements = 0;
           }
           else{
               // Nothing to do
           }
     }

     var completedPatches = fitRemainingStepsOnLastPatch(patches, routeAllSteps, remainingSteps);

     return completedPatches;
}

/*
    Slice the route in 'quantityOfPatches' patches.
    param routeToSlice - 'google.maps.DirectionsRoute' object that contains the route to slice
    param quantityOfPatches - Quantity of patchs to slice the route
    return An array with the patches.
 */
function sliceRoute(routeToSlice){

    // Set the quantity of patchs as you want
    var quantityOfPatches = 10;

    // Array with the route legs
    var routeLegs = routeToSlice.legs[0];

    // All steps in route
    var routeAllSteps  = routeLegs.steps;
    
    // Separate the steps on patches
    var patches = distributeStepsOnPatches(routeAllSteps, quantityOfPatches);

     return patches;
}


/*
    Calculate the distance covered by a patch
    param patch - Array that contains the steps of the patch
    return The distance covered by this patch in kilometers
 */
function calculatePatchDistance(patch){

    var patchSize = patch.length;

    var patchDistance = 0;

    var i = 0;
    for(i = 0; i < patchSize; i++){
        // Distance in meters
        patchDistance = patchDistance + patch[i].distance.value;
    }

    // Converting the distance in meters to kilometers
    patchDistance = patchDistance/1000;

    return patchDistance;
}

/*
    Get the start and ending coordinates of patchesArray.
    param patchesArray - Array with the patches
    return An array that contains the start and ending coordinates from all patches in google.maps.LatLng object
 */
function getCoordinatesOfPatch(patchesArray){


    var quantityOfPatches = patchesArray.length;

    var patchesSize = [quantityOfPatches];

    var i = 0;
    for(i = 0; i < quantityOfPatches; i++){
          patchesSize[i] = patchesArray[i].length;
    }

    var patchesCoordinates = [quantityOfPatches];

    i = 0;
    for(i = 0; i < quantityOfPatches; i++){

          var firstStepOnPatchIndex = 0;
          var lastStepOnPatchIndex = patchesSize[i] - 1;

          var coordinates = {

              startLatitude: patchesArray[i][firstStepOnPatchIndex].start_location.lat(),
              startLongitude: patchesArray[i][firstStepOnPatchIndex].start_location.lng(),
              endLatitude:  patchesArray[i][lastStepOnPatchIndex].end_location.lat(),
              endLongitude: patchesArray[i][lastStepOnPatchIndex].end_location.lng(),
              // Distance covered by this patch
              distance: calculatePatchDistance(patchesArray[i])
          };

          patchesCoordinates[i] = coordinates;
    }

    return patchesCoordinates;
}



function countTheAccidentsByPatch(latitude, longitude){

  var route = getCurrentRoute();

  var routeSliced = sliceRoute(route);

  var routePatchesCoordinates = getCoordinatesOfPatch(routeSliced);

  var quantityOfPatches = routeSliced.length;

  var accidentsInPatch = [];
  var j = 0;

  var i = 0;
  for(i = 0; i < routePatchesCoordinates.length; i++){
    accidentsInPatch[i] = 0;
  }

  i = 0;
  for(i = 0; i < routePatchesCoordinates.length; i++){

    j = 0;
    while(j < latitude.length){
      if(routePatchesCoordinates[i].startLatitude > routePatchesCoordinates[i].endLatitude){
        if(latitude[j] < routePatchesCoordinates[i].startLatitude && latitude[j] > routePatchesCoordinates[i].endLatitude){
          if(longitude[j] < routePatchesCoordinates[i].startLongitude && longitude[j] > routePatchesCoordinates[i].endLongitude){
            accidentsInPatch[i] = accidentsInPatch[i] + 1;
          }
        }
      }
      else if(routePatchesCoordinates[i].startLatitude < routePatchesCoordinates[i].endLatitude){
        if(latitude[j] > routePatchesCoordinates[i].startLatitude && latitude[j] < routePatchesCoordinates[i].endLatitude){
          if(longitude[j] > routePatchesCoordinates[i].startLongitude && longitude[j] < routePatchesCoordinates[i].endLongitude){
            accidentsInPatch[i] = accidentsInPatch[i] + 1;
          }
        }
      }
      else{
        // Nothing to do
      }
      j++;
    }

  }

  identifyDangerousPatch(accidentsInPatch, routePatchesCoordinates, routeSliced);

}


// Patch which has seen more accidents
function identifyDangerousPatch(accidentsInPatch, routePatchesCoordinates, routeSliced){

  // Auxiliary variable to see which patch has more accidents
  var moreAccidentsPatch = 0;
  var positionMoreAccidentsPatch = 0;

  // Scans the array looking for the portions more accidents
  for (var i = 0; i < accidentsInPatch.length; i++) {
    if (accidentsInPatch[i] > moreAccidentsPatch) {
      moreAccidentsPatch = accidentsInPatch[i];
            positionMoreAccidentsPatch = i;
    }
  }

  var quantityOfSteps = routeSliced[positionMoreAccidentsPatch].length;
  var coordinatesOfPatchMostDangerous = [];
  var k = 0;
  var j = 0;
  var route = getCurrentRoute();
  var quantityCoordinatesByStep;

  for (i = 0; i < quantityOfSteps; i++) {
    quantityCoordinatesByStep  = routeSliced[positionMoreAccidentsPatch][i].path.length;
    for(k = 0; k < quantityCoordinatesByStep; k++){
      coordinatesOfPatchMostDangerous[j] = routeSliced[positionMoreAccidentsPatch][i].path[k];
      j++;
    }
  }
  // Receves as parameter the latitude and longitude of the portions more accidents
  $(document).ready(function(){

      $("#sinalizeAccidentsInPatch").click(function(){
         sinalizeMostDangerousPatch(coordinatesOfPatchMostDangerous);    
      });
  });
       
       

}


function sinalizeMostDangerousPatch(route){

      // Contains the data from the array
      var pointArray = new google.maps.MVCArray(route);

      heatmap = new google.maps.visualization.HeatmapLayer({

        // The data passed here will be appering in the heatmap layer
        data: pointArray,

        // Opacity of the map layer
        opacity: 0.8,

        // Radius of each heatmap pointArray
        radius: 11

      });

      // Sets the heapmap layer on the map
      heatmap.setMap(map);

}
