Jax.LINEAR = 1;
Jax.EXPONENTIAL = 2;
Jax.EXP2 = 3;

Jax.Material.Fog = Jax.Class.create(Jax.Material, {
  initialize: function($super, options) {
    options = Jax.Util.normalizeOptions(options, {
      shader: "fog",
      algorithm: Jax.EXP2,
      start: 10.0,
      end: 100.0,
      density: 0.0015,
      color:[1,1,1,1]
    });
    options.color = Jax.Util.colorize(options.color);
    options.color = [options.color[0],options.color[1],options.color[2],options.color[3]];
    if (typeof(options.algorithm) == "string") {
      var name = options.algorithm;
      options.algorithm = Jax[name];
      if (!options.algorithm) throw new Error("Jax: Fog algorithm must be one of LINEAR, EXPONENTIAL, or EXP2");
    }
    $super(options);
  },
  
  setVariables: function(context, mesh, options, vars) {
    vars.set('End', this.end);
    vars.set('Scale', 1.0 / (this.end - this.start));
    vars.set('Algorithm', this.algorithm);
    vars.set('Density', this.density);
    vars.set('FogColor', this.color);
  }
});
