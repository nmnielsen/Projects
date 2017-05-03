/*
  The basic rules for what needs to be availble from this student.js are:

  dataFinish: will be called once at the end of d3.csv()
  choiceSet: will be called with radioButton changes
  toggleState: will be called with clicks on states or their marks

  Beyond that, you can add and re-structure things as you see fit.
  Most of the code below is based on project 2. Places where its
  especially important to add code are marked with "(your code here)"
*/

// trying to use https://toddmotto.com/mastering-the-module-pattern/
var P3 =(function () {

/* variable controlling map geometry; you can reduce this if you think
   it will help your depiction of which states are selected, while not
   creating too distracting a boundary between all the states */
var HexScaling = 0.9; // hexagon scaling (1 == touching)

/* radius of circular marks in bivariate case; change this if you
   think it will make things clearer */
var MarkRadius = 5.0;
/* CmapLegSize and PCALegSize are set in index.html since they
   shouldn't be changed */

/* duration, in milliseconds, of transitions between visualizations */
var TransitionDuration = 500;

/* other variables to track current state of visualization */
var CmapUnivariate = false; // is current colormap univariate?
/* you can add variables more here.  For example, how will you keep
   track of whether a state has been selected in the visualization?
   (your code here) */

/* utility functions that should not need changing */
var lerp = function (w,[a,b]) { return (1.0-w)*a + w*b; }
var unlerp = function (x,[x0,x1]) { return (x-x0)/(x1-x0); }
var minmax = function (arr) {
    var minval=arr[0], maxval=minval;
    arr.map(function (x) {
            minval = Math.min(x, minval);
            maxval = Math.max(x, maxval);
        });
    return [minval, maxval];
}

// Array for keeping track of which states have been toggled ("Selected")
var SelectedStates = [];
// Function to check if given state is already selected.
// returns the index PLUS ONE if the state is present, else returns 0
function isStatesSel(state) {
    for(i = 0; i < SelectedStates.length; i++){
        if(SelectedStates[i] == state){ return i + 1; }
    }
    return false;
}
    

/* toggleState is called when you click on either a state in the map,
   or its indication in the colormap legend; the passed "state" is the
   two letter state abbreviation.  That means you can select the hexagon
   for the state with d3.select("#" + state + "hex"), and the tickmark
   for the state with d3.select("#" + state + "mark"). How you modify
   the tickmark for the state will probably depend on whether a univariate
   or a bivariate colormap is being used (CmapUnivariate) */
var toggleState = function(state) {
     // feel free to remove this next line (for debugging)
    console.log("toggleState(" + state + "): hello");
    
    var iss = isStatesSel(state); // either 0, state not already toggled, or some integer > 0 which is the position of the state + 1 in SelectedStates
    if( iss ){ 
        //console.log(state + " is already in " + )
        SelectedStates.splice(iss - 1, 1); }
    else{ SelectedStates.push(state); }
    
    console.log(SelectedStates);
    console.log(SelectedStates.length);
    console.log(isStatesSel("MA"));

    // Changes the appearance of the tick marks to reflect toggled states
    d3.select("#cmlMarks").selectAll("ellipse")
            .data(P3.data)
            .transition().duration(TransitionDuration)
            .attr("stroke-dasharray", 
                  function(d){
                    if( isStatesSel(d.State) ){ return "4,4"; }
                    else{ return "black"; }
                    });
    
    // Changes the appearance of the hexes to reflect toggled states
    // should come back and create a better change - currently, if a hex is surrounded you can't tell if it is selected.
    // Maybe shrink the selected states as well?
    d3.select("#mapUS").selectAll("path")
        .data(P3.data) /* (your code here) */
        .transition().duration(TransitionDuration)
//        .attr("stroke", function(d){
//                    if( isStatesSel(d.State) ){ return "black"; }
//                    else{ return "black"; }})
        .attr("stroke-dasharray", 
                  function(d){
                    if( isStatesSel(d.State) ){ return "10, 10"; }
                    else{ return "black"; }})
        .attr("stroke-width", 
                  function(d){
                    if( isStatesSel(d.State) ){ return 4; }
                    else{ return 0; }});
    /* (your code here) */

}

/* PCA: computes PCA of given array of arrays.
   uses http://www.numericjs.com for linear algebra */
var PCA = function (dcols) {
    if (dcols.length < 3) {
        d3.select("#pcaWarning").html("PCA() needs at least 3 variables (got " + dcols.length+ ")");
        return null;
    }
    /* else got enough variables */
    d3.select("#pcaWarning").html("");
    // dcols: (short) array of (long) data arrays (each element ~ a csv column)
    // drows: (long) array of data vectors (each element ~ a csv row)
    var drows = numeric.transpose(dcols);
    // covar: covariance matrix
    var covar = numeric.dot(dcols,drows);
    /* NOTE: numeric.dot is for matrix multiplication in general,
       which includes matrix-matrix multiply (as above), and
       matrix-vector multiply, as well as
       vector-vector (inner) product, which you might want to use for
       compute coordinates in the basis of PCA eigenvectors */
    // nmeig: numeric.js's eigensystem representation of covar
    var nmeig = numeric.eig(covar);
    /* NOTE: If you see in the javascript console:
       "Uncaught Error: numeric: eigenvalue iteration does not converge -- increase maxiter?"
       then it is likely that one or more values being passed to
       numeric.eig(covar) are not numeric (e.g. "NaN"), which can happen if
       one or more values in dcols are not numeric */
    // evec: array of covariance matrix eigenvectors (unit-length)
    var evec = numeric.transpose(nmeig.E.x);
    // evec: array of corresponding eigenvalues
    var eval = nmeig.lambda.x;
    // esys: zipping up each component of eigensysem into a little object:
    // "l" for eigenvalue, "v" eigenvector, and "mm" for zero-centered range
    // of projections of data into that eigenvector
    var esys = eval.map(function (_,i) {
            var mindot = 0, maxdot = 0;
            drows.map(function (_,j) { // learn range of projections
                    var x = numeric.dot(drows[j],evec[i]);
                    mindot = Math.min(mindot, x);
                    maxdot = Math.max(maxdot, x);
                });
            // center range around zero
            var mmin = Math.min(mindot, -maxdot);
            var mmax = Math.max(-mindot, maxdot);
            // make sure the range itself is non-zero
            if (mmin == mmax) {
                mmin = -1;
                mmax = 1;
            }
            return {"l": eval[i],
                    "v": evec[i],
                    // simplify needlessly precise representation of range
                    "mm": [d3.format(".3f")(mmin), d3.format(".3f")(mmax)]};
        });
    // sort eigensystem in descending eigenvalue order
    esys.sort(function (a,b) {
            var x = a.l; var y = b.l;
            return ((x < y) ? 1 : ((x > y) ? -1 : 0));
        });
    return esys;
}

/* dataNorm should take an array of scalar data values and return an
   array resulting from two transformations:
   1) subtract out the mean
   2) make the variance 1
   Making the variance 1 means that no data variable will out an outsized
   influence on the PCA just because of a choice of units: multiplying a
   variable by 10 won't change its information content, but it would
   increase that variable's role in a PCA. */
var dataNorm = function (arr) {
    //console.log("arr: " + arr);
    var sum = 0;    // sum of values in array
    var sqsum = 0;  // sum((differences from average)^2)
    // Compute sum
    for(i = 0; i < arr.length; i++){ sum += Number(arr[i]); }
    // Compute mean
    var mean = sum / arr.length;
    // Compute sqsum and set the mean of the new array = 0
    for(i = 0; i < arr.length; i++){
        arr[i] -= mean;
        sqsum += arr[i] * arr[i];
    }
    var ogvar = Math.sqrt((sqsum / arr.length)); // Variance of original array
    // Set the variance = 1
    for(i = 0; i < arr.length; i++){ arr[i] /= ogvar; }
    return arr;
    /* (your code here) (~12 lines of code) */

}

/* (from Project2 solution) some stuff we can use for each
 * univariate map.  Feel free to ignore/delete this function
 * if you want to structure things differently */
var stuff = function (what, mmGiven) {
    var sel = function(d) {return +d[what]}
    var slc = P3.data.map(sel);
    var mm = ((typeof mmGiven === 'undefined')
              ? minmax(slc) // mmGiven not passed, find min,max
              : mmGiven);   // use given mmGiven
    return {"select" : sel,
            "minmax" : mm,
            "cmlscl" : d3.scale.linear().domain(mm).range([0,P3.CmapLegSize-1]),
            };
}

var PCA_stuff = function(what){
    var sel = function(d){return +d[what];};
    var sls = P3.data.map(sel);
    var mm = minmax(slc);
    var hiVar = Math.max(Math.abs(mm[0]), Math.abs(mm[1]));
    mm = [-1 * hiVar, hiVar];
    return{"select" : sel,
           "minmax" : mm,
           "cmlscl" : d3.scale.linear().domain(mm).range([0, P3.CmapLegSize - 1])};
}

var dataFinish = function (data) {
    /* save data for future reference (for simplicity, from here on
       out P3.data is the only way we'll refer to the data) */
    P3.data = data;

    /* much of the code here is from Project2 reference solution
       http://people.cs.uchicago.edu/~glk/ class/DataVis/p2.js
       but you should feel free to modify/augment/edit it as you
       see fit for your work (your code here) */
    var voteTotMax = 0;
    P3.data.map(function(d) {
            var VT = +d["ObamaVotes"] + +d["RomneyVotes"];
            d["VT"] = VT;
            d["PL"] = +d["ObamaVotes"]/(1.0 + VT);
            voteTotMax = Math.max(voteTotMax, VT);
        });
    P3.data.map(function(d) {
            d["VA"] = 1 - Math.pow(1- d["VT"]/voteTotMax, 3);
        });
    
    P3.data.map(function(d){ d.push})

    /* learn earnings ranges */
    P3.earnWMinMax = minmax(P3.data.map(function(d) {return +d["WE"]}));
    P3.earnMMinMax = minmax(P3.data.map(function(d) {return +d["ME"]}));

    /* obesity-related things */
    P3.obeseStuff = stuff("OB");
    var _obeseCmap = d3.scale.linear() /* colormap prior to quantization */
        .domain([0,0.4,1])
        .range([d3.rgb(100,200,100), d3.rgb(220,220,210), d3.rgb(130,0,0)]);
    P3.obeseCmap = function(r) {
        var w0 = Math.round(lerp(unlerp(r,P3.obeseStuff["minmax"]), [-0.5, 6.5]));
        return _obeseCmap(unlerp(Math.min(6, w0),[-0.5, 6.5]));
    }

    /* create unemployment colormap */
    P3.unempStuff = stuff("UN");
    P3.unempCmap = d3.scale.linear()
        .domain([0,1/3,2/3,1].map(function(w) {return lerp(w,P3.unempStuff["minmax"]);}))
        .range([d3.rgb(0,0,0), d3.rgb(210,0,0), d3.rgb(255,210,0), d3.rgb(255,255,255)]);

    /* create infant mortality map */
    P3.imortStuff = stuff("IM");
    P3.imortCmap = function(d) {
        var scl = d3.scale.linear().domain(P3.imortStuff["minmax"]);
        return d3.hcl(scl.range([330,-15])(d),
                      25*Math.pow(Math.sin(scl.range([0,3.14159])(d)),2),
                      scl.range([0,100])(d));
    }

    /* create univariate voter maps */
    P3.pleanStuff = stuff("PL", [0,1]);
    var Dhcl = d3.hcl(d3.rgb(0,0,210));
    var Rhcl = d3.hcl(d3.rgb(210,0,0));
    P3.pleanCmap = function(x) {
        return d3.hcl(x < 0.5 ? Rhcl.h : Dhcl.h,
                      (x < 0.5 ? Rhcl.c : Dhcl.c)*
                      (1 - Math.pow(1 - (Math.abs(x-0.5)/0.5),4)),
                      lerp(x,[Rhcl.l,Dhcl.l]));
    }

    /* create bivariate voter map */
    P3.plean2Cmap = function([pl,va]) {
        var col = P3.pleanCmap(pl);
        return d3.hcl(col.h,  lerp(va,[0,col.c]),  lerp(va,[100,col.l]));
    }

    /* create bivariate earnings maps */
    P3.ERcmap = function([mm,ww]) {
        var erw = unlerp(ww,P3.earnWMinMax);
        var erm = unlerp(mm,P3.earnMMinMax);
        return d3.lab(25+40*(erw + erm), 0, 170*(erm - erw));
    }

    /* New colormaps that you want to create go here ... */
    // Worked with GJones and LPham on color maps
    // PCA Univariate
    P3.PCAUCmap = d3.scale.linear()
    .domain([0,1])
    .range([d3.rgb("#E57C00"), d3.rgb("#0076FF")])
    .interpolate(d3.interpolateRgb)
    
    // PCA Bivariate
    P3.PCAbi1 = d3.scale.linear()
    .range([d3.rgb("#353839"), d3.rgb("#E57C00")])
    .interpolate(d3.interpolateRgb)
    
    P3.PCAbi2 = d3.scale.linear()
    .range([d3.rgb("#0076FF"), d3.rgb("white")])
    .interpolate(d3.interpolateRgb)
    
    P3.PCAbiCmap = function([mmx, mmy]){
        P3.PCAbi1.domain([mmx, mmy])
        P3.PCAbi2.domain([mmx, mmy])
        return function([x, y]){
            var col = d3.interpolateRgb(P3.PCAbi1(y),P3.PCAbi2(y));
            return col(unlerp(x, [mmx, mmy]));
        }
    }
    
    P3.whitemap = function([x,y]){
        return d3.rgb("white");
    }
    /* (your code here) */

    /* NOTE: any elements set up in index.html can be modified here,
       prior to any calls to choiceSet.  For example, to change the
       fill in all the #cmlMarks ellipses to pink, you could:

       d3.select("#cmlMarks").selectAll("ellipse")
         .data(P3.data)
         .attr("fill", "pink");

       Or, to add zero-opacity white dashed stroke around each state's
       hexagon (the "path" inside the per-state "g" in "#mapUS"):

       d3.select("#mapUS").selectAll("g").select("path")
         .data(P3.data)
         .attr("stroke", "white")
         .attr("stroke-width", 5)
         .attr("stroke-dasharray", "7,4")
         .attr("stroke-opacity", 0);
    */

}

// This is called whenever a radio button is clicked
var choiceSet = function (wat,pvars) {
    console.log(wat,pvars); // feel free to remove this debugging line
    var PCA_stuff;
    var whichPC = {"PC0" : [0]
                   ,"PC1" : [1]
                   ,"PC2" : [2]
                   ,"PC01" : [0,1]
                   ,"PC02" : [0,2]
                   ,"PC12" : [1,2]};
    var biPC = {"PC01" : ["PC0", "PC1"]
               ,"PC12" : ["PC1", "PC2"]
               ,"PC02" : ["PC0", "PC2"]};

    if (wat.startsWith("PC")) {
        if (pvars.length < 1) {
            d3.select("#pcaWarning").html("Select at least one variable below for PCA");
            return;
        }
        d3.select("#pcaWarning").html("");
        /* Else we have at least one variable for PCA; so we do that here,
           in the following steps:
           1) make an array (suppose its called "dcols") of the result
           of calling dataNorm() on each data variable (your code here)
           (can be as little as 3 lines) */
        var dcols = [];
       for(var i = 0; i < pvars.length; i++){
           dcols[i] = P3.data.map(
               function(d){ //console.log(d[pvars[i]]); 
                           return d[pvars[i]]});
       }
        //console.log(dcols);
        dcols = dcols.map(dataNorm);

        /* 2) If less than 3 variables were selected for PCA, add to "dcols"
           one or two arrays of zeros, so that PCA() has at least three
           data variables to work on (your code here) (a few lines) */
        var zeroes = [];
            for(var i = 0; i < 51; i++){
                zeroes[i] = 0;
            }
        for(var j = dcols.length; j < 3; j++){
            dcols[j] = zeroes;
        }
    

        /* 3) call PCA(dcols), and add to P3.data the coordinates of each
           datum in the basis of the first three principle components.  Note
           that "var drows = numeric.transpose(dcols)" will get you an array
           of per-state data (row) vectors, and then with
           "P3.data.map(function(d,ii) { })" you can set PCA coordinate
           fields in per-state datum "d" from the dot product between
           drows[ii] and the PCA eigenvectors. Visualizing the PCA
           results should use these PCA coordinates in the same way that
           in the previous project you used the original data variables.
           (your code here) (roughly ~20 lines of code) */
        
 //       console.log(PCA(dcols));
//        console.log(P3.data);
        var drows = numeric.transpose(dcols);
        var pcadcols = PCA(dcols);
        var eigvals = pcadcols.map(function(d){ return d.l});
        var eigvecs = pcadcols.map(function(d){ return d.v});
        
        P3.data.map(function(d, ii){
        //    console.log(d);
            //console.log(drows[ii]);
            //console.log(PCA(dcols)[0].v);
           // console.log(ii);
            d.PC0 = numeric.dot(drows[ii], pcadcols[0].v);
           // console.log(d.PC0);
            d.PC1 = numeric.dot(drows[ii], pcadcols[1].v);
            //console.log(d.PC1);
            d.PC2 = numeric.dot(drows[ii], pcadcols[2].v);
            //console.log(d.PC2);
        })
        //console.log(P3.data);

        /* 4) Visualize what the PCA did with the given data variables inside
           the #pcaMarks svg by changing the text element #pcaXX for
           all variables XX (selected via d3.select("#pca" + XX)):
           a) Make the text opaque for the variables actually included in
           the PCA, and transparent for the rest.
           b) For the variables in PCA, move the text to a position that
           indicates how that variable is aligned with the principle
           component(s) shown (one component for PC0, PC1, PC2, and
           two components for PC01, PC02, PC12). Compute this by forming
           a vector of length pvars.length which is all 0s except for 1 at
           the index of XX in pvars, and then using numeric.dot() to get
           the dot product with a principle component eigenvector. Since
           this is the dot product of two unit-length vectors, the result
           should be in [-1,1], which you should map to coordinates
           [30,P3.PCALegSize-30]) in X or [P3.PCALegSize-30,30]) in Y.
           Text is moved by modifying the "transform" attribute to
           "translate(cx,cy)" for position (cx,cy). For variables not
           in the PCA, the text should be moved back to the center at
           (P3.PCALegSize/2,P3.PCALegSize/2).  You can iterate over the
           #pcaXX with "P3.PCAVars.map(function(XX) { })".
           Changes to both opacity and position should also be made via a
           transition of duration TransitionDuration.  (your code here)
           (roughly ~30 lines of code) */
        
        P3.PCAVars.map(function(XX){
            var pvarind = pvars.indexOf(XX);
            if( pvars.indexOf(XX) >= 0){
                // Create vector of length max(pvars.length, 3) which is all 0s except for 1 at the index of XX in pvars
            var pvec = Array(Math.max(pvars.length, 3)).fill(0);
                pvec[pvars.indexOf(XX)] = 1;
            var xdot = numeric.dot(pvec, eigvecs[whichPC[wat][0]]);
            console.log(Number(whichPC[wat][0]));
            console.log(eigvecs[whichPC[wat][0]]);
            console.log(pvec);
            console.log(numeric.dot(pvec, eigvecs[whichPC[wat][0]]));
                
            var x = lerp(unlerp(xdot, [-1, 1])//[Number(pcadcols[pvarind].mm[0])
                                      //,Number(pcadcols[pvarind].mm[1])])
                              , [30,P3.PCALegSize-30]);
            var y = (P3.PCALegSize / 2);
            if( wat == "PC01" || wat == "PC02" || wat == "PC12" ){
                var ydot = numeric.dot(pvec, eigvecs[whichPC[wat][1]]);
                y = lerp(unlerp(ydot, [-1, 1])//[Number(pcadcols[pvarind].mm[0])
                                      //,Number(pcadcols[pvarind].mm[1])])
                             , [P3.PCALegSize-30,30]);}
            d3.select("#pca" + XX)
                .transition().duration(TransitionDuration)
                .attr("opacity", 1)
                .attr("transform", "translate(" + x + "," + y + ")");
            }
            else{
                d3.select("#pca" + XX)
                .transition().duration(TransitionDuration)
                .attr("opacity", 0)
                .attr("transform", "translate(" + (P3.PCALegSize / 2) + "," + (P3.PCALegSize / 2) + ")");
            }
        }); 
        
        switch(wat){
            case "PC0" : 
                P3.PCAUCmap.domain(pcadcols[0].mm)
                PCA_stuff = stuff("PC0", pcadcols[0].mm)
                break;
            case "PC1" :
                P3.PCAUCmap.domain(pcadcols[1].mm)
                PCA_stuff = stuff("PC1", pcadcols[1].mm)
                break;
            case "PC2" :
                P3.PCAUCmap.domain(pcadcols[2].mm)
                PCA_stuff = stuff("PC2", pcadcols[2].mm)
                break;
        }
        if( wat == "PC01" || wat == "PC02" || wat == "PC12" ){
            var overMax = Math.max(pcadcols[whichPC[wat][0]].mm[1]
                                   ,pcadcols[whichPC[wat][1]].mm[1]);
            var bmap = P3.PCAbiCmap([-1 * overMax, overMax]);
        }
    } else {
        d3.select("#pcaWarning").html("");
        /* else this isn't a PCA visualization, so none of the
           variables are involved in the PCA, so re-center all the PCA
           marks and make them transparent (your code here) (~10 lines) */

    }

    /* is this a univariate map? */
    CmapUnivariate = (["OB", "UN", "IM", "VU", "PC0", "PC1", "PC2"].indexOf(wat) >= 0);

    /* set the colormapping function */
    var colormap = {"OB"   : P3.obeseCmap,
                    "UN"   : P3.unempCmap,
                    "IM"   : P3.imortCmap,
                    "VU"   : P3.pleanCmap,
                    "VB"   : P3.plean2Cmap,
                    "ER"   : P3.ERcmap,
                    "PC0"  : P3.PCAUCmap,
                    "PC1"  : P3.PCAUCmap,
                    "PC2"  : P3.PCAUCmap,
                    "PC01" : bmap,
                    "PC02" : bmap,
                    "PC12" : bmap
                    /* anything else? (your code here) */
    }[wat];
    var cml, cmlx, cmly, sel, mmx, mmy;
    if (CmapUnivariate) {
        var stf = {"OB" : P3.obeseStuff,
                   "UN" : P3.unempStuff,
                   "IM" : P3.imortStuff,
                   "VU" : P3.pleanStuff,
                   "PC0" : PCA_stuff,
                   "PC1" : PCA_stuff,
                   "PC2" : PCA_stuff
                   /* anything else? (your code here) */
        }[wat];
        //console.log("stf: " + stf)
        [cml,mmx,sel] = [stf["cmlscl"], stf["minmax"], stf["select"]];
        mmy = null;
    } else {
        cml = mmx = mmy = sel = null;
    }
    /* handle the bivariate cases */
    switch (wat) {
    case "VB" :
        cmlx = cmly = d3.scale.linear().domain([0, 1]).range([0,P3.CmapLegSize-1]);
        mmx = mmy = [0,1];
        sel = function(d) {return [+d.PL,+d.VA]};
        break;
    case "ER" :
        cmlx = d3.scale.linear().domain(P3.earnMMinMax).range([0,P3.CmapLegSize-1]);
        cmly = d3.scale.linear().domain(P3.earnWMinMax).range([0,P3.CmapLegSize-1]);
        mmx = P3.earnMMinMax;
        mmy = P3.earnWMinMax;
        sel = function(d) {return [+d.ME,+d.WE]};
        break;
    case "PC01" :
    case "PC02" :
    case "PC12" :
            var overMax = Math.max(pcadcols[whichPC[wat][0]].mm[1]
                                   ,pcadcols[whichPC[wat][1]].mm[1]);
            var mmx = [-1 * overMax, overMax];
            var mmy = [-1 * overMax, overMax];
            cmlx = d3.scale.linear().domain(mmx).range([0, P3.CmapLegSize - 1]);
            cmly = d3.scale.linear().domain(mmx).range([0, P3.CmapLegSize - 1]);
            break;
    /* (your code here) */
    }
    
    switch(wat){
        case "PC01" :
            sel = function(d){ return [+d.PC0, +d.PC1];};
            break;
        case "PC12" :
            sel = function(d){ return [+d.PC1, +d.PC2];};
            break;
        case "PC02" : 
            sel = function(d){ return [+d.PC0, +d.PC2];};
            break;
    }

    /* 1) reapply colorDatum to the "fill" of the states in #mapUS.
       be sure to add a transition that lasts TransitionDuration */
    d3.select("#mapUS").selectAll("path")
        .data(P3.data) /* (your code here) */
        .transition().duration(TransitionDuration)
        .style("fill", function(d){ return colormap(sel(d)); });
    

    /* 2) reset pixels of cmlImage.data, and redisplay it with
       P3.cmlContext.putImageData(P3.cmlImage, 0, 0); */
    if (CmapUnivariate) {
        for (var j=0, k=0, c; j < P3.CmapLegSize; ++j) {
            for (var i=0; i < P3.CmapLegSize; ++i) {
                if (0 == j) {
                    c = d3.rgb(colormap(cml.invert(i)));
                    P3.cmlImage.data[k++] = c.r;
                    P3.cmlImage.data[k++] = c.g;
                    P3.cmlImage.data[k++] = c.b;
                    P3.cmlImage.data[k++] = 255;
                } else {
                    P3.cmlImage.data[k] = P3.cmlImage.data[(k++)-4*P3.CmapLegSize];
                    P3.cmlImage.data[k] = P3.cmlImage.data[(k++)-4*P3.CmapLegSize];
                    P3.cmlImage.data[k] = P3.cmlImage.data[(k++)-4*P3.CmapLegSize];
                    P3.cmlImage.data[k] = 255; k++;
                }
            }
        }
    } else {
        for (var j=0, k=0, c; j < P3.CmapLegSize; ++j) {
            for (var i=0; i < P3.CmapLegSize; ++i) {
                c = d3.rgb(colormap([cmlx.invert(i),
                                     cmly.invert(P3.CmapLegSize-1-j)]));
                P3.cmlImage.data[k++] = c.r;
                P3.cmlImage.data[k++] = c.g;
                P3.cmlImage.data[k++] = c.b;
                P3.cmlImage.data[k++] = 255;
            }
        }
    }
    P3.cmlContext.putImageData(P3.cmlImage, 0, 0);

    /* 3) set d3.select("#xminlabel").html(), and similarly for the other
       three labels, to reflect the range of values that are
       colormapped when displaying "wat".  For univariate maps,
       set xminlabel and yminlabel to show the range, and set
       yminlabel and ymaxlabel to an empty string.  For bivariate
       maps, set all labels to show the X and Y ranges. */
    d3.select("#xminlabel").html("<text>" + mmx[0] + "</text>");
    d3.select("#xmaxlabel").html("<text>" + mmx[1] + "</text>");
    if (CmapUnivariate) {
        d3.select("#yminlabel").html("<text></text>");
        d3.select("#ymaxlabel").html("<text></text>");
    } else {
        d3.select("#yminlabel").html("<text>" + mmy[0] + "</text>");
        d3.select("#ymaxlabel").html("<text>" + mmy[1] + "</text>");
    }

    /* 4) update the geometric attributes (rx, ry, cx, cy) of the #cmlMarks
       to indicate the data variables, and any other attributes you want
       to control according to whether the state is selected. Changes should
       happen with a transition of duration TransitionDuration.
       (your code here) (or interspersed below) */
    if (CmapUnivariate) {
        d3.select("#cmlMarks").selectAll("ellipse")
            .data(P3.data)
            .transition().duration(TransitionDuration)
            .attr("rx", 0.05) // if zero, outline may disappear
            .attr("ry", P3.CmapLegSize/4)
            .attr("cx", function(d) { return 0.5+cml(sel(d)); })
            .attr("cy", P3.CmapLegSize/2)
//            .attr("stroke", 
//                  function(d){
//                    if( isStatesSel(d.State) ){ return "white"; }
//                    else return "black";
//                    })
            //.each(function(d){ if( isStatesSel(d.State) ){ d.attr("stroke", "pink"); } });
            //.attr("stroke", "pink");
        console.log("Univariate transition");
    } else {
        d3.select("#cmlMarks").selectAll("ellipse")
            .data(P3.data)
            .transition().duration(TransitionDuration)
            .attr("rx", MarkRadius).attr("ry", MarkRadius)
            .attr("cx", function(d) { return 0.5+cmlx(sel(d)[0]); })
            .attr("cy", function(d) { return P3.CmapLegSize-0.5-cmly(sel(d)[1]); });
        console.log("Bivariate Transition");
    }
}

/* shouldn't have to change anything from here on */
return { // the P3 "API"
    HexScaling: HexScaling,
    choiceSet: choiceSet,
    dataFinish: dataFinish,
    toggleState: toggleState,
};

})(); // end "var P3=(function () {" module container

/* Answer questions here. Each should be no more than ~40 words.

#1) Concisely describe and justify your method of indicating, in the map
and in the colormap, whether a state is selected.
    When a state is selected, either by clicking the corresponding hex or tick mark, the tick mark becomes a dashed shape (line or circle, depending on whether it is univariate or bivariate) and the hex recieves a dashed black outline.  The dashes on the tick marks maintain position and allow the line to be as visible as previously.  
    For the hexes, the dashed outlines are sized so that when an unselected hex is surrounded by selected hexes on all 6 sides, it still appears unselected.
    Finally, the rotation of the transitions makes it easier to track new selections between the map and colormap, as the motion grabs the viewers attention.


#2) In the terminology of "An Algebraic Process for Visualization
Design" (class May 26), what is one "confuser" for PCA as it it used
in this project (i.e. a particular change in the data that will have
no significant effect on the PCA result)?  (hint: think about what
dataNarm() does, and how the covariance matrix is computed).  There
are at least three possible answers.
    If the variance of the data was increased, say by multiplying all of the data by a constant, the PCA would not reflect this change.  This is because dataNorm() standardizes the variance to 1 for every data set.  The absolute variance of a different datasets is not shown by the PCA result, only the relative variance within a dataset is visible.



#3) Concisely describe and justify your design of colormaps for the
univariate and bivarite cases of PCA visualization.
    Univariate:  As larger absolute values reflect a higher significance, with both positive and negative values, we employed a colormap with a neutral "zero" color.  If the map were inverted, the relative luminences of tick marks would still provide a valid comparison.  Finally, the color of orange and blue was motivated by their high contrast, aiming to illustrate a difference between positive and negative values in addition to the magnitude conveyed by luminence.
    
    Bivariate:  As the colormap is representing two axes, our colormap uses two ranges to portray the data.  The x axis is reflected by a range from orange to blue, while the y axis is represented by change in luminence.  Thus, values with similar y values will have similar luminence, while variations in the x axis component is visibile in the orange-blue hue range.


#4) Based on exploring the data with PCA, what was a result that you found
from PCA of three or four variables?  Describe your result in terms of
which variables had similar vs complementary contributions to the PCA,
or the geographic trend you saw in the map.
    California, Texas, and Florida exhibit a consistent clustering on the variables Unemployment, Google Search, and Foreign Born.  The extremely close similarity between Google Search and Foreign Born (seen by the overlapping GS & FB in PC01 as well is in the very slight variation between PC01 and PC02) in relation to Unemployment is particularly interesting, as these are all states with high levels of immigration.  This suggests a connection between popular awareness of the states and immigration, and reveals the differences between economic opportunities in these states.


(extra credit) #5) How did you maximize visual consistency when switching
between PCA and other radio buttons?

*/
