import { get_faces } from "./cow.js";
import { get_vertices } from "./cow.js";

// Shaders

var vertexShaderText = 
[
'#version 300 es',
'precision mediump float;',
'',
// Model data 
'in vec3 vertPosition;', // Vertex Position 
'in vec3 vertNormal;', // Vertex Normals 
'uniform mat4 mWorld;', // World Matrix 
'uniform mat4 mView;', // View Matrix 
'uniform mat4 mProj;', // Projection Matrix 

'uniform float objectMode;', // Projection Matrix 


// Lighting Locations 
'uniform vec3 pointLight_Position;', // Vertex Position 
'uniform vec3 spotLight_Position;', // Vertex Normals 
// Lighting Matricies 
'uniform mat4 pointLight_Rotation ;', // Rotation Matrix Point Light  
'uniform mat4 spotLight_Rotation ;', // Rotation Matrix Spot Light  


// Out Data 
'out vec3 fragNormal;',
'out vec3 pointLightModelPosition;',
'out vec3 spotLightModelPosition;',
'out vec3 fragPosition;',
'out float objectType;',  



'',
'void main()',
'{',
'if (objectMode == 0.0){',
'  gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);',
'  fragPosition = ( mWorld * vec4(vertPosition, 1.0)).xyz;',
'fragNormal = (  mWorld * vec4(vertNormal,0.0)).xyz;',
'pointLightModelPosition = (pointLight_Rotation * vec4(pointLight_Position,1.0)).xyz;',
'spotLightModelPosition = (spotLight_Rotation * vec4(spotLight_Position,1.0)).xyz;',
'}',
'else{gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0); }',
'objectType = objectMode;',
'}'
].join('\n');

var fragmentShaderText =
[
'#version 300 es',
'precision mediump float;',

// unifroms:

'uniform vec3 pointLight_Position ;', // PointLight Position 



'uniform vec3 SpotLight_Position ;', // SpotLight Position 

// Vertex to Fragment Data : 
'in vec3 fragNormal;',
'in vec3 pointLightModelPosition;',
'in vec3 spotLightModelPosition;',
'in vec3 fragPosition;',
'in float objectType;',  


//Out Color 
'out vec4 fragColor;',

'void main()',
'{', // Ambient Light 


'if(objectType == 0.0){',
	
'vec3 cameraPosition = vec3(0,0,30);', // hard coded for now
'vec3 spotLightOrigintoCenter = vec3(0,-6.0,-6.0);', // hard coded for now

'vec3 pointLighttoSurface =  pointLightModelPosition - fragPosition;',
'vec3 spotLighttoSurface =  spotLightModelPosition - fragPosition;',
'vec3 cameraToSurfaceLight =  cameraPosition - fragPosition ;',


	// Point Light 

	'float object_shininess = 40.0;',
	'  vec3 pointLightHalfVector = normalize(normalize(pointLighttoSurface) + normalize(cameraToSurfaceLight));',
	'  vec3 spotLightHalfVector = normalize(normalize(spotLighttoSurface) + normalize(cameraToSurfaceLight));',

	'float pointLightSpecular = 0.0;', // To Do add the specular uniform
	'float pointLight =  max(dot(normalize(fragNormal) , normalize(pointLighttoSurface)), 0.0);', // To Do add the kDpointLight uniform
	'if(pointLight > 0.0) {pointLightSpecular = 0.3*pow(dot(normalize(fragNormal), pointLightHalfVector), object_shininess);}',
	// SpotLight 
	'float spotLight = 0.0;',
	'float spotLightSpecular = 0.0;',
	'float spotlightlim = dot(normalize(spotLightOrigintoCenter) , normalize(-spotLighttoSurface));',
	'if(spotlightlim >= 0.99){spotLight = (dot(normalize(fragNormal) , normalize(spotLighttoSurface)));};',
	'if(spotLight > 0.0) {spotLightSpecular = 0.4*pow(dot(normalize(fragNormal), spotLightHalfVector), object_shininess);}',


	'',
	// Total Light 
	
	' vec3 totalLight  = pointLight + spotLight*vec3(0.5 , 0.3 ,0.0) + 0.6;',
	' vec3 objectColor = vec3(0.33,0.215 , 0.117);',
	' fragColor = vec4(totalLight*objectColor ,1.0);',
	' fragColor.rgb *= totalLight;  ',
	 ' fragColor.rgb += pointLightSpecular +spotLightSpecular ;  ',
	 '}',
	 'else{fragColor = vec4(1.0 , 0.0, 0.0, 1.0); }',
'}'
].join('\n');

var canvas ;
var gl;
var mousedown = false;
var mousedragXoffset = 0;
var mousedragYoffset = 0;
var translateXcoefficient = 0.0 ;
var translateYcoefficient = 0.0 ;
var rotationXangel = 0.0 ;
var rotationYangel = 0.0 ;
var program;

var translateZcoefficient = 0.0 ;
var rotationZangel = 0.0 ;

var xmouseStart = 0.0; 
var ymouseStart = 0.0 ;
var reset = false;
var stopMovingPointLight = false;
var stopMovingSpotLight = false;


var increment = true;
// Helper fucntion 

function clampValue(value , maxValue, minValue , step) {

  
	  if (increment) {
		value += step;
	  } else {
		value -= step;
	  }
  
	
  
	  if (value >= maxValue) {
		increment = false;
	  } else if (value <= minValue) {
		increment = true;
	  }
	return value;
  }
  

// Helper fucntion to generate coords for the cone 

  function generateConeObject(radius, height, numSegments) {
    let vertices = [];
    let indices = [];
    let angleStep = (2 * Math.PI) / numSegments;

    for (let i = 0; i < numSegments; i++) {
        let angle = i * angleStep;
        let x = radius * Math.cos(angle);
        let z = radius * Math.sin(angle);
        vertices.push(x, -height / 2, z);
        
        indices.push(i, (i + 1) % numSegments);

        indices.push(i, numSegments);
    }

    vertices.push(0, height / 2, 0);

    return { vertices: vertices, indices: indices };
}


function generateCubeObject(size) {
  var halfSize = size / 2;

  var vertices = [
    -halfSize, -halfSize, -halfSize, 
    halfSize, -halfSize, -halfSize, 
    halfSize, halfSize, -halfSize, 
    -halfSize, halfSize, -halfSize, 
    -halfSize, -halfSize, halfSize, 
    halfSize, -halfSize, halfSize, 
    halfSize, halfSize, halfSize, 
    -halfSize, halfSize, halfSize 
  ];

  var indices = [
    0, 1, 1, 2, 2, 3, 3, 0,
    4, 5, 5, 6, 6, 7, 7, 4, 
    0, 4, 1, 5, 2, 6, 3, 7 
  ];

  return { vertices: vertices, indices: indices };
}

// Setting up WebGl
function setWebGlUp(){
	console.log('This is working');

	 canvas = document.getElementById('game-surface');
	 gl = canvas.getContext('webgl2');
	
	if (!gl) {
		console.log('WebGL not supported, falling back on experimental-webgl');
		gl = canvas.getContext('experimental-webgl');
	}
	
	if (!gl) {
		alert('Your browser does not support WebGL');
	}
	gl.clearColor(0.75, 0.85, 0.8, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.cullFace(gl.BACK);
}



// setting up controls 

// Controls enum 
const controls = {
	idle: -1,
	translateXY: 0,
	translateZright: 1,
	rotateXY: 2,
	rotateZright: 3,
	rotateZleft: 4,
	translateleft: 5,

  };
var currenttransformation = controls.idle;

// event handling system listners 

function intiEventListners(){ 
	window.addEventListener("contextmenu", e => e.preventDefault())
	canvas.addEventListener('mousedown', handelEvents);
	canvas.addEventListener('mouseup', handelEvents);
	window.addEventListener('keydown', handelEvents);
	window.addEventListener('keyup', handelEvents);
	canvas.addEventListener('mousemove', handleCursorMovment);

}



function handelEvents(event){

	
	// Mosue drag event; 
	if(event.type === "mousedown"){
		event.preventDefault()
		mousedown = true;
		xmouseStart = event.offsetX;
		ymouseStart = event.offsetY;

		if(currenttransformation == controls.idle){
			if(event.button == 2){
				currenttransformation = controls.rotateXY;

			}
			else if(event.button == 0){
				currenttransformation = controls.translateXY;
			}
		}
		
	}
	 else if (event.type === "mouseup"){
		mousedown = false;
		currenttransformation = controls.idle;
		console.log("mouseup"); 
		mousedragXoffset = 0.0; 
		mousedragYoffset = 0.0;
	}

	else if(event.type === "keydown"){
		if(currenttransformation == controls.idle){
			if(event.key == "ArrowUp"){
				currenttransformation = controls.translateZright
				console.log("moving up")
			}
			else if (event.key == "ArrowDown"){
				currenttransformation = controls.translateleft
				console.log("moving down");
			}
			else if (event.key == "ArrowRight"){
				currenttransformation = controls.rotateZright;
				console.log("rotating right");
			}
			else if (event.key == "ArrowLeft"){
				currenttransformation = controls.rotateZleft;
				console.log("rotating left");
			}
		}
		if(event.key == "r" || event.key == "R"){
			reset = true;
		}
		else if(event.key == "s" || event.key == "S"){
			if(stopMovingSpotLight == false){stopMovingSpotLight = true}else {stopMovingSpotLight = false}
		}
		else if(event.key == "p" || event.key == "P"){
			if(stopMovingPointLight == false){stopMovingPointLight = true}else {stopMovingPointLight = false}
		}
	}

	else if (event.type === "keyup"){
		currenttransformation = controls.idle;
		console.log("keyup")
	}

}

function handleCursorMovment(event){
	console.log()
	if(mousedown){
		mousedragXoffset = ((event.offsetX - xmouseStart) /2);
		xmouseStart = event.offsetX;

		mousedragYoffset = ((event.offsetY - ymouseStart) /2);
		ymouseStart = event.offsetY;
	}
	
}
// updating uniforms 
function updateUniforms(){
	if(currenttransformation == controls.rotateXY){
		if(mousedragXoffset == 0.5 || mousedragXoffset == -0.5){mousedragXoffset = 0.0 ;} //edge case 
		rotationXangel += mousedragXoffset;
		if(mousedragYoffset == 0.5 || mousedragYoffset == -0.5){mousedragYoffset = 0.0 ;} //edge case 
		rotationYangel += mousedragYoffset;
	}
	else if(currenttransformation == controls.translateZright){
		translateZcoefficient+=10;
	}
	else if (currenttransformation == controls.translateleft){
		translateZcoefficient-=10;
	}
	else if(currenttransformation == controls.rotateZright){
		rotationZangel+=10;
	}
	else if (currenttransformation == controls.rotateZleft){
		rotationZangel-=10;
	}

	else if (currenttransformation == controls.translateXY){
		if(mousedragXoffset == 0.5 || mousedragXoffset == -0.5 || mousedragXoffset == 1 || mousedragXoffset == -1){mousedragXoffset = 0.0 ;} //edge case 
		translateXcoefficient += mousedragXoffset;
		if(mousedragYoffset == 0.5 || mousedragYoffset == -0.5 || mousedragYoffset == 1 || mousedragYoffset == -1){mousedragYoffset = 0.0 ;} //edge case 
		translateYcoefficient += mousedragYoffset;
	}
}
// WebGL 

// Init the shaders 

function intiShaders(){
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

	gl.shaderSource(vertexShader, vertexShaderText);
	gl.shaderSource(fragmentShader, fragmentShaderText);

	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		console.error('ERROR compiling vertex shader!', gl.getShaderInfoLog(vertexShader));
		return;
	}

	gl.compileShader(fragmentShader);
	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		console.error('ERROR compiling fragment shader!', gl.getShaderInfoLog(fragmentShader));
		return;
	}

	 program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('ERROR linking program!', gl.getProgramInfoLog(program));
		return;
	}
	gl.validateProgram(program);
	if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
		console.error('ERROR validating program!', gl.getProgramInfoLog(program));
		return;
	}
}


// generateNormals 
function generateNormals(vertcies , indexes) {
    var numVertices = vertcies.length / 3;
    var numFaces = indexes.length / 3;
  
    var faceNormals = [];
  
    var vertexNormals = [];
    for (var i = 0; i < numVertices; i++) {
      vertexNormals[i] = vec3(0.0, 0.0, 0.0);
    }
  
    function calulateTrigNormal(v1, v2, v3) {
      var e1 = subtract(v2, v1);
      var e2 = subtract(v3, v1);
      return normalize(cross(e1, e2));
    }
  
    for (var i = 0; i < numFaces; i++) {
      var index1 = indexes[i * 3];
      var index2 = indexes[i * 3 + 1];
      var index3 = indexes[i * 3 + 2];
  
      var v1 = vec3(
        vertcies[index1 * 3],
        vertcies[index1 * 3 + 1],
        vertcies[index1 * 3 + 2]
      );
      var v2 = vec3(
        vertcies[index2 * 3],
        vertcies[index2 * 3 + 1],
        vertcies[index2 * 3 + 2]
      );
      var v3 = vec3(
        vertcies[index3 * 3],
        vertcies[index3 * 3 + 1],
        vertcies[index3 * 3 + 2]
      );
  
      var faceNormal = calulateTrigNormal(v1, v2, v3);
      faceNormals[i] = faceNormal;
  
      // Add face normal to vertex normals of its three vertices
      vertexNormals[index1] = add(vertexNormals[index1], faceNormal);
      vertexNormals[index2] = add(vertexNormals[index2], faceNormal);
      vertexNormals[index3] = add(vertexNormals[index3], faceNormal);
    }
  
    // Normalize vertex normals
    for (var i = 0; i < numVertices; i++) {
      vertexNormals[i] = normalize(vertexNormals[i]);
    }
  
    return vertexNormals;
  }


// Render The cow
function renderModel(){

	var cone = generateConeObject(1.0 , 1.0  , 30);

	var cube = generateCubeObject(1.0);

	
	var indices = get_faces();
	var modfiedFaces = indices.map((element) => subtract(element , vec3(1,1,1)));
	var perVertexNormals = generateNormals(flatten(get_vertices()) , flatten(modfiedFaces))

	var pointLightCords = vec3(8,5,5);
	var spotLightCords = vec3(0,6,6);
	let vertexCount = cone.indices.length;

	var modelVertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(get_vertices())), gl.STATIC_DRAW);

	var modelIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, modelIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(flatten(modfiedFaces)), gl.STATIC_DRAW);

	var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
	gl.vertexAttribPointer(
		positionAttribLocation, // Attribute location
		3, // Number of elements per attribute
		gl.FLOAT, // Type of elements
		gl.FALSE,
		3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
		0 // Offset from the beginning of a single vertex to this attribute
	);
	gl.enableVertexAttribArray(positionAttribLocation);


	var normalsBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(perVertexNormals)), gl.STATIC_DRAW);

	var normalAttrLoc = gl.getAttribLocation(program, 'vertNormal');
	gl.vertexAttribPointer(
		normalAttrLoc, // Attribute location
		3, // Number of elements per attribute
		gl.FLOAT, // Type of elements
		gl.FALSE,
		3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
		0 // Offset from the beginning of a single vertex to this attribute
	);

	gl.enableVertexAttribArray(normalAttrLoc);




	// Tell OpenGL state machine which program should be active.
	gl.useProgram(program);

	// setting up the view matrix
	const matrix = [
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    ];
    
    var model = matrix;
    model = rotate(90, [0.0, 1.0, 0.0]);

	var lightModel = rotate(0.0 , [0.0, 1.0, 0.0]);
    var eye = vec3(0, 0, 30);
    var target = vec3(0, 0, 0);
    var up = vec3(0, 1, 0);
    var view = lookAt(
        eye,
        target,
        up
    );


   
    var aspect = canvas.width / canvas.height;

    // TODO: Create a projection matrix.
    var projection = perspective(40, aspect, 0.1, 1000.0);

	//


	var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
	var matViewUniformLocation = gl.getUniformLocation(program, 'mView');
	var matProjUniformLocation = gl.getUniformLocation(program, 'mProj');
	var reversedLightDirectionUnifromLocation = gl.getUniformLocation(program, 'pointLight_Position');
	var mLightModelUnifromLocation = gl.getUniformLocation(program, 'pointLight_Rotation');

	var spotLightPosUnifrom = gl.getUniformLocation(program, 'spotLight_Position');
	var spotLightRotationUnifrom = gl.getUniformLocation(program, 'spotLight_Rotation');
	var objectmodeUnifrom = gl.getUniformLocation(program, 'objectMode');



	gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, flatten(model));
	gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, flatten(view));
	gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, flatten(projection));
	gl.uniform3fv(reversedLightDirectionUnifromLocation, flatten(pointLightCords));
	gl.uniformMatrix4fv(mLightModelUnifromLocation, gl.FALSE, flatten(lightModel));
	gl.uniform3fv(spotLightPosUnifrom, flatten(spotLightCords));
	gl.uniformMatrix4fv(spotLightRotationUnifrom, gl.FALSE, flatten(lightModel));
	//gl.drawElements(gl.TRIANGLES, modfiedFaces.length * 3, gl.UNSIGNED_SHORT, 0);
		let i = 0 ;
		let x = 0 ;

		
	var loop = function () {

		
		updateUniforms();

		// Generate the normals 
		gl.bindBuffer(gl.ARRAY_BUFFER, modelVertexBuffer);
		var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
		gl.vertexAttribPointer(
			positionAttribLocation, // Attribute location
			3, // Number of elements per attribute
			gl.FLOAT, // Type of elements
			gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
			0 // Offset from the beginning of a single vertex to this attribute
		);

		gl.enableVertexAttribArray(positionAttribLocation);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, modelIndexBuffer);
		gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
		gl.enableVertexAttribArray(positionAttribLocation);


		var normalsBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatten(perVertexNormals)), gl.STATIC_DRAW);
		
	
		var normalAttrLoc = gl.getAttribLocation(program, 'vertNormal');
		gl.vertexAttribPointer(
			normalAttrLoc, // Attribute location
			3, // Number of elements per attribute
			gl.FLOAT, // Type of elements
			gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
			0 // Offset from the beginning of a single vertex to this attribute
		);
	
		gl.enableVertexAttribArray(normalAttrLoc);


		gl.uniform1f(objectmodeUnifrom, 0.0);
		let rotationXmodel = rotate((rotationXangel/180)*70, [0.0, 1.0, 0.0]);
		let rotationYmodel = rotate((rotationYangel/180)*70, [1.0, 0.0, 0.0]);
		let rotationZmodel = rotate((rotationZangel/180)*70, [0.0, 0.0, 1.0]);
		let translateXY = translate(translateXcoefficient/20 , translateYcoefficient/-20 , translateZcoefficient/20);
		let rotationModel = mult(rotationYmodel, mult(rotationZmodel , rotationXmodel));
		if(reset == true){
			rotationXangel = 0.0 ; rotationYangel = 0.0 ; rotationZangel = 0.0; translateXcoefficient = 0.0; translateYcoefficient = 0.0; translateZcoefficient =0.0;
			reset = false;
		}
		model = mult(translateXY , rotationModel);
		gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, flatten(model));
		let pointLightModel = rotate( i, [0.0, 1.0, 0.0]);
		let spotLightModel = rotate(x , [0.0, 1.0, 0.0]);
		gl.uniformMatrix4fv(mLightModelUnifromLocation, gl.FALSE, flatten(pointLightModel));
		gl.uniformMatrix4fv(spotLightRotationUnifrom, gl.FALSE, flatten(spotLightModel));

		if(stopMovingSpotLight != false){x =clampValue(x , 90 , -90 , 1);}
		if(stopMovingPointLight != false){(i+=1)/360;}



		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
		gl.drawElements(gl.TRIANGLES, modfiedFaces.length * 3, gl.UNSIGNED_SHORT, 0);

		gl.uniform1f(objectmodeUnifrom, 1.0);

		  // drawing the cone
		  let coneRoation = rotate(x, [0.0, 0.0, 1.0]);
		  model = mult(coneRoation, translate(0, 7, 6));
		  var condeIndexBuffer = gl.createBuffer();
		  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, condeIndexBuffer);
		  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cone.indices), gl.STATIC_DRAW);
		  gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, flatten(model));
	  
		  var coneVertexBuffer = gl.createBuffer();
		  gl.bindBuffer(gl.ARRAY_BUFFER, coneVertexBuffer);
		  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cone.vertices), gl.STATIC_DRAW);
		  var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
		  gl.vertexAttribPointer(
			positionAttribLocation, // Attribute location
			3, // Number of elements per attribute
			gl.FLOAT, // Type of elements
			gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
			0 // Offset from the beginning of a single vertex to this attribute
		  );
		  gl.enableVertexAttribArray(positionAttribLocation);
	  
		  gl.drawElements(gl.LINES, vertexCount, gl.UNSIGNED_SHORT, 0);
	  
		  // drawing the cube 
		  let cubeRotation = rotate(i, [0.0, 1.0, 0.0]);
		  model = mult(cubeRotation, translate(8, 5, 5));
		  gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, flatten(model));
		  var cubeIndexBuffer = gl.createBuffer();
		  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
		  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cube.indices), gl.STATIC_DRAW);

	  
		  var cubeVertexBuffer = gl.createBuffer();
		  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
		  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cube.vertices), gl.STATIC_DRAW);
	  
		  var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
		  gl.vertexAttribPointer(
			positionAttribLocation, // Attribute location
			3, // Number of elements per attribute
			gl.FLOAT, // Type of elements
			gl.FALSE,
			3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
			0 // Offset from the beginning of a single vertex to this attribute
		  );
	  
		  gl.enableVertexAttribArray(positionAttribLocation);
	  
		  gl.drawElements(gl.LINES, cube.indices.length, gl.UNSIGNED_SHORT, 0);

		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
	
}



var InitDemo = function () {
	setWebGlUp();
	intiEventListners();
	intiShaders();
	renderModel();

	

};

window.onload = InitDemo;