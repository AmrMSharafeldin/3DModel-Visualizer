# 3D Model Visualizer using WebGL

### Phase 1: Implemented Interactive Rotation for the Cow Model
   - The model rotates around the X and Y axes in response to mouse drag.
   - Rotation around the Z axis is controlled by the left and right arrow keys.

### Phase 2: Enabled Translation Controls for the Cow Model
   - The model translates in response to mouse drag (similar to the rotation controls).

### Phase 3: Generated and Assigned Per-Vertex Normal Data
   - Normal vectors were calculated for each vertex to enable realistic lighting effects.

### Phase 4: Implemented Phong Lighting
   - Based on [WebGL Fundamentals - 3D Lighting Directional](https://webglfundamentals.org/webgl/lessons/webgl-3d-lighting-directional.html), directional lighting was applied for realistic shading and highlights.

### Phase 5: Refined Color Settings
   - Adjusted color properties of the model to achieve a more natural appearance.

# Shaders

### Vertex Shader

```glsl
#version 300 es
precision mediump float;

// Model data 
in vec3 vertPosition; // Vertex Position 
in vec3 vertNormal;   // Vertex Normals 
uniform mat4 mWorld;  // World Matrix 
uniform mat4 mView;   // View Matrix 
uniform mat4 mProj;   // Projection Matrix 
uniform float objectMode; // Object mode 

// Lighting Locations 
uniform vec3 pointLight_Position; // Point light position 
uniform vec3 spotLight_Position;  // Spot light position 

// Lighting Matrices 
uniform mat4 pointLight_Rotation; // Rotation matrix for point light  
uniform mat4 spotLight_Rotation;  // Rotation matrix for spot light  

// Outgoing data to fragment shader
out vec3 fragNormal;
out vec3 pointLightModelPosition;
out vec3 spotLightModelPosition;
out vec3 fragPosition;
out float objectType;

void main() {
    if (objectMode == 0.0) {
        gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
        fragPosition = (mWorld * vec4(vertPosition, 1.0)).xyz;
        fragNormal = (mWorld * vec4(vertNormal, 0.0)).xyz;
        pointLightModelPosition = (pointLight_Rotation * vec4(pointLight_Position, 1.0)).xyz;
        spotLightModelPosition = (spotLight_Rotation * vec4(spotLight_Position, 1.0)).xyz;
    } else {
        gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
    }
    objectType = objectMode;
}
```

### Fragment Shader 
```#version 300 es
precision mediump float;

// Uniforms
uniform vec3 pointLight_Position; // Point light position
uniform vec3 SpotLight_Position;  // Spot light position

// Data from vertex shader
in vec3 fragNormal;
in vec3 pointLightModelPosition;
in vec3 spotLightModelPosition;
in vec3 fragPosition;
in float objectType;

// Output color
out vec4 fragColor;

void main() {
    if (objectType == 0.0) {
        vec3 cameraPosition = vec3(0, 0, 30); // Hardcoded camera position
        vec3 spotLightOrigintoCenter = vec3(0, -6.0, -6.0); // Hardcoded spotlight origin

        vec3 pointLighttoSurface = pointLightModelPosition - fragPosition;
        vec3 spotLighttoSurface = spotLightModelPosition - fragPosition;
        vec3 cameraToSurfaceLight = cameraPosition - fragPosition;

        float object_shininess = 40.0;
        vec3 pointLightHalfVector = normalize(normalize(pointLighttoSurface) + normalize(cameraToSurfaceLight));
        vec3 spotLightHalfVector = normalize(normalize(spotLighttoSurface) + normalize(cameraToSurfaceLight));

        float pointLightSpecular = 0.0;
        float pointLight = max(dot(normalize(fragNormal), normalize(pointLighttoSurface)), 0.0);
        if (pointLight > 0.0) {
            pointLightSpecular = 0.3 * pow(dot(normalize(fragNormal), pointLightHalfVector), object_shininess);
        }

        float spotLight = 0.0;
        float spotLightSpecular = 0.0;
        float spotlightlim = dot(normalize(spotLightOrigintoCenter), normalize(-spotLighttoSurface));
        if (spotlightlim >= 0.99) {
            spotLight = dot(normalize(fragNormal), normalize(spotLighttoSurface));
        }
        if (spotLight > 0.0) {
            spotLightSpecular = 0.4 * pow(dot(normalize(fragNormal), spotLightHalfVector), object_shininess);
        }

        vec3 totalLight = pointLight + spotLight * vec3(0.5, 0.3, 0.0) + 0.6;
        vec3 objectColor = vec3(0.33, 0.215, 0.117);
        fragColor = vec4(totalLight * objectColor, 1.0);
        fragColor.rgb *= totalLight;
        fragColor.rgb += pointLightSpecular + spotLightSpecular;
    } else {
        fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
}
```
