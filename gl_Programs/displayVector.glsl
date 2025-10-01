#version 300 es

precision sampler2D highp;

uniform sampler2D dye;

uniform vec3 bias;
uniform vec3 scale;

in vec2 texCoord;

void main() {
    //gl_FragColor = vec4(bias + scale * texture(velocity, texCoord).xyz, 1.0);
    gl_FragColor = vec4(texture(velocity, texCoord).xyz, 1.0);
}