#version 460 es

precision highp float;

in vec2 i_texCoord;

// varying vec2 coords;
// varying vec2 coords_top;
// varying vec2 coords_bottom;
// varying vec2 coords_left;
// varying vec2 coords_right;

out vec2 o_texCoord;

void main() {
    gl_Position = coords;

    o_texCoord = i_texCoord;
}