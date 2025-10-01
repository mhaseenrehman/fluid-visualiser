#version 460 es

precision highp float;

uniform sampler2D pressure;
uniform sampler2D velocity;

uniform vec2 gridSize;
uniform float gridScale;

void main() {
    // Obtain scaled texture coordinate
    vec2 uv = gl_FragCoord.xy / gridSize.xy;

    // Obtain x and y offets to obtain neighbours
    vec2 xOffset = vec2(1.0 / gridSize.x, 0.0);
    vec2 yOffset = vec2(0.0, 1.0 / gridSize.y);

    // Obtain neighbours of pressure texture
    float pl = texture(pressure, uv - xOffset).x;
    float pr = texture(pressure, uv + xOffset).x;
    // float pb = texture(pressure, uv - yOffset).x;
    // float pt = texture(pressure, uv + yOffset).x;
    float pb = texture(pressure, uv - yOffset).y;
    float pt = texture(pressure, uv + yOffset).y;
    
    // Obtain Gradient
    float scale = 0.5 / gridScale;
    vec2 gradient = scale * vec2(pr - pl, pt - pb);
    
    // Subtract Pressure Gradient from Divergent field to obtain Non-Divergence Field
    vec2 wc = texture(w, uv).xy;
    gl_FragColor = vec4(wc - gradient, 0.0, 1.0);
}