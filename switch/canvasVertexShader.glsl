#version 300 es
in vec2 position;
in vec2 i_texCoord;

// out vec2 coords;
// out vec2 coords_top;
// out vec2 coords_bottom;
// out vec2 coords_left;
// out vec2 coords_right;

out vec2 texCoord;

void main() {
    gl_Position = position;
    texCoord = i_texCoord;
}


