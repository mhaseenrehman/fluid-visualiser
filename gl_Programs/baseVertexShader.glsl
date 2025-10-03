#version 300 es

precision highp float;

//in vec2 i_texCoord; // -> Maybe use this instead?
in vec2 i_position;
out vec2 o_texCoord;

void main() {
    //o_texCoord = i_texCoord;
    o_texCoord = i_position*0.5 + 0.5;
    gl_Position = i_position;
}