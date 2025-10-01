#version 300 es

precision highp float;

in vec2 i_texCoord;

in vec4 i_position;

out vec2 o_texCoord;

void main() {
    o_texCoord = i_texCoord;
    gl_Position = i_position;
}