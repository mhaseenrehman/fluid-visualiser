#version 300 es

precision mediump float;
precision mediump sampler2D;

uniform sampler2D pressure;
uniform vec2 gridSize;
uniform float value;

void main() {
    // Change Resolution of map -> texture coordinates and obtain Texel coords
    vec2 uv = gl_FragCoord.xy / gridSize.xy;
    gl_FragColor = value * texture(pressure, uv);
}