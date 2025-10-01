#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D grid;

uniform vec2 gridSize;
uniform vec2 gridOffset;

uniform float scale;

void main() {
    // Boundary Condition - Velocity is 0 at boundary edge
    vec2 uv = (gl_FragCoord.xy + gridOffset.xy) / gridSize.xy;
    gl_FragColor = vec4(scale * texture(grid, uv).xyz, 1.0);
}