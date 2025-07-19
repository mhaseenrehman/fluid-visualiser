#version 460 es

precision highp float;
precision highp sampler2D;

// Coordinates of point in field
in vec2 coords;

// Timestep since last iteration, 1 / Grid scale, Input Velocity field texture, Field to be advected
uniform float timestep;
uniform float rdx;
uniform sampler2D velocityGrid;
uniform sampler2D fieldToAdvect;

// Final velocity field - Advected quanitity
out vec4 velocity;

// Linearly interpolate between the 4 closest points in the grid
vec4 fourBilinearInterpolation(sampler2D field, vec2 pos) {
    vec4 st;
    st.xy = floor(pos - 0.5) + 0.5;
    st.zw = st.xy + 1;
    vec2 t = pos - st.xy;

    // Sample texture at interpolated positions
    vec4 t_1 = texture2D(field, st.xy);
    vec4 t_2 = texture2D(field, st.zy);
    vec4 t_3 = texture2D(field, st.xw);
    vec4 t_4 = texture2D(field, st.zw);

    // Bilinear Interpolation
    return mix(mix(t_1, t_2, t.x), mix(t_3, t_4, t.x), t.y);
}

// Entry into shader
void main() {
    // May not be texture2D(...).xy might be texture2D(...).zw
    vec2 position = coords - timestep*rdx*texture2D(velocityGrid, coords).xy;
    outVelocity = fourBilinearInterpolation(fieldToAdvect, position);
}