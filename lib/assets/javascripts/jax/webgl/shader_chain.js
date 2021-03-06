//= require "jax/webgl/shader"

Jax.ShaderChain = (function() {
  function sanitizeName(name) {
    return name.replace(/-/, '_');
  }
  
  function preprocessFunctions(self, prefix, suffix, source) {
    /* TODO mangle all function and structure names to prevent conflicts -- right now we only mangle main() */
    
    return source.replace(/void\s*main\s*\(/g, 'void '+sanitizeName(prefix)+'_main_'+sanitizeName(suffix)+'(');
  }
  
  function preprocessorOptions(self) {
    return {
      shader: self,
      ignore_es_precision: true,
      export_prefix: self.getName(),
      exports: self.gatherExports(),
      skip_export_definitions: true,
      skip_global_definitions: [] // array containing definitions so they aren't accidentally redefined
    };
  }
  
  function preventRedefinition(imap, options) {
    for (var j in imap)
      options.skip_global_definitions.push(imap[j].full_name);
  }
  
  return Jax.Class.create(Jax.Shader.Program, {
    initialize: function($super, name) {
      $super();
      this.name = name;
      this.shaders.push(this.getMasterShader());
      this.phases = [];
    },
    
    getMasterShader: function() {
      return this.master_shader = this.master_shader || new Jax.Shader({});
    },
    
    addShader: function(shader) {
      if (typeof(shader) == "string")
        if (Jax.shaders[shader])
          shader = Jax.shaders[shader];
        else throw new Error("Shader is not defined: "+shader);
      else if (!shader) throw new Error("Argument must be a Jax.Shader, or a String equal to its name");
      this.phases.push(shader);
      this.invalidate();
      if (!shader.getName) throw new Error("Not an instance of Jax.Shader: "+JSON.stringify(shader));
      return sanitizeName(shader.getName()+(this.phases.length - 1)+"_");
    },
    
    getShaderNames: function() {
      var result = [];
      for (var i = 0; i < this.phases.length; i++)
        result[i] = this.phases[i].getName();
      return result;
    },
    
    removeAllShaders: function() {
      while (this.phases.length > 0) this.phases.pop();
    },
    
    link: function($super, context, material) {
      var program = this.getGLProgram(context);
      
      if (!program.linked) {
        var master = this.getMasterShader();
        
        var numVaryings = this.countVaryings(material),
            numUniforms = this.countUniforms(material),
            numAttributes = this.countAttributes(material);
        
        if (numVaryings > Jax.Shader.max_varyings)
          throw new RangeError("Varyings ("+numVaryings+") exceed maximum number of varyings ("+Jax.Shader.max_varyings+") supported by GPU! Try using a shorter chain.");
        if (numUniforms > Jax.Shader.max_uniforms)
          throw new RangeError("Uniforms ("+numUniforms+") exceed maximum number of uniforms ("+Jax.Shader.max_uniforms+") supported by GPU! Try using a shorter chain.");
        if (numAttributes > Jax.Shader.max_attributes)
          throw new RangeError("Attributes ("+numAttributes+") exceed maximum number of attributes ("+Jax.Shader.max_attributes+") supported by GPU! Try using a shorter chain.");

        master.setVertexSource(this.getVertexSource(material));
        master.setFragmentSource(this.getFragmentSource(material));
        
        program = $super(context, material);
      }
      
      return program;
    },
    
    getFragmentSource: function(options) {
      options = Jax.Util.normalizeOptions(options, preprocessorOptions(this));
      
      var source = "";
      source += this.getExportDefinitions(options);

      for (var i = 0; i < this.phases.length; i++) {
        options.local_prefix = this.phases[i].getName()+i;
        source += "\n/**** Shader chain index "+i+": "+this.phases[i].getName()+" ****/\n";
        source += preprocessFunctions(this, this.phases[i].getName()+i, 'f', this.phases[i].getFragmentSource(options));
        source += "\n\n";

        preventRedefinition(this.phases[i].getInputMap(options), options);
      }
      
      return source + this.getFragmentMain(options);
    },
    
    getVertexSource: function(options) {
      options = Jax.Util.normalizeOptions(options, preprocessorOptions(this));
      
      var source = "";
      source += this.getExportDefinitions(options);

      for (var i = 0; i < this.phases.length; i++) {
        options.local_prefix = this.phases[i].getName()+i;
        source += "\n/**** Shader chain index "+i+": "+this.phases[i].getName()+" ****/\n";
        source += preprocessFunctions(this, this.phases[i].getName()+i, 'v', this.phases[i].getVertexSource(options));
        source += "\n\n";
        
        preventRedefinition(this.phases[i].getInputMap(options), options);
      }
      
      return source + this.getVertexMain(options);
    },
    
    getVertexMain: function(options) {
      var functionCalls = "";
      for (var i = 0; i < this.phases.length; i++) {
        var args = "";
        if (this.phases[i].getVertexArgumentCount() > 0)
          args = "gl_Position";  
        functionCalls += "  "+sanitizeName(this.phases[i].getName())+i+"_main_v("+args+");\n";
      }
      
      return "/**** Shader chain generated #main ****/\n" +
             "void main(void) {\n" +
               functionCalls +
             "}\n";
    },
    
    getFragmentMain: function(options) {
      var functionCalls = "";
      var lastTookArguments = false;
      for (var i = 0; i < this.phases.length; i++) {
        var args = "";
        if (this.phases[i].getFragmentArgumentCount() > 0) {
          lastTookArguments = true;
          args = "ambient, diffuse, specular";
        } else lastTookArguments = false;
        functionCalls += "  "+sanitizeName(this.phases[i].getName())+i+"_main_f("+args+");\n";
      }
      
      var colors = "#ifdef PASS_TYPE\n"
                 + "  if (PASS_TYPE == "+Jax.Scene.ILLUMINATION_PASS+") gl_FragColor = ambient + diffuse + specular;\n"
                 + "  else gl_FragColor = ambient;\n"
                 + "#else\n"
                 + "  gl_FragColor = ambient + diffuse + specular;\n"
                 + "#endif\n";
                 
      return "/**** Shader chain generated #main ****/\n" +
             "void main(void) {\n" +
               "vec4 ambient = vec4(1.0,1.0,1.0,1.0), diffuse = vec4(1.0,1.0,1.0,1.0), specular = vec4(1.0,1.0,1.0,1.0);\n" +
               functionCalls +
               (lastTookArguments ? colors : "") +
             "}\n";
    },
    
    getExportDefinitions: function(options) {
      var source = "\n/** Exported shader chain variables **/\n";
      var skip = [];
      for (var i = 0; i < this.phases.length; i++) {
        source += this.phases[i].getExportDefinitions(options.export_prefix, skip);
        for (var j in this.phases[i].options.exports)
          skip.push(j);
      }
      return source;
    },
    
    getGlobalDefinitions: function(options, isVertex) {
      var source = "\n/** Shared uniforms, attributes and varyings **/\n";
      var map = this.getInputMap(options);
      for (var name in map) {
        if (map[name].scope == "attribute" && !isVertex) continue;
        source += map[name].scope+" "+map[name].type+" "+map[name].full_name+";\n";
      }
      return source;
    },
    
    getPerShaderInputMap: function(options) {
      options = Jax.Util.normalizeOptions(options, {local_prefix:""});
      var map = {};
      var tracking_map = {};
      var name;
      for (var i = 0; i < this.phases.length; i++) {
        name = this.phases[i].getName();
        var entry = (map[name] = map[name] || { uniforms: [], attributes: [], varyings: [] });

        options.local_prefix = this.phases[i].getName()+i;
        
        var _map = this.phases[i].getInputMap(options);
        for (name in _map) {
          var variable = _map[name];
          // ignore anything that's already been defined, as it's primarily required by a shader with
          // higher priority (implied that the fact that it came first in the list of phases)
          if (!tracking_map[variable.full_name]) {
            if (variable.scope == 'uniform')        entry.uniforms.push(variable);
            else if (variable.scope == 'attribute') entry.attributes.push(variable);
            else if (variable.scope == 'varying')   entry.varyings.push(variable);
            else throw new Error("unhandled variable scope: "+JSON.stringify(variable));

            tracking_map[variable.full_name] = 1;
          }
        }
      }
      return map;
    },
    
    getInputMap: function(options) {
      options = Jax.Util.normalizeOptions(options, {local_prefix:""});
      var map = {};
      for (var i = 0; i < this.phases.length; i++) {
        options.local_prefix = this.phases[i].getName()+i;
        var _map = this.phases[i].getInputMap(options);
        for (var name in _map) {
          var variable = _map[name];
          if (map[variable.full_name]) {
            if (map[name].type      != variable.type)
              throw new Error("Conflicting types for variable '"+name+"' ("+map[name].type+" and "+variable.type+")!");
            if (map[name].scope     != variable.scope)
              throw new Error("Conflicting scopes for variable '"+name+"' ("+map[name].scope+" and "+variable.scope+")!");
          }
          else map[variable.full_name] = variable;
        }
      }

      return map;
    },
    
    countVariables: function(scope, options) {
      var map = this.getInputMap(options);
      var count = 0;
      for (var i in map) {
        if (map[i].scope == scope) count++;
      }
      return count;
    },
    
    countVaryings: function(options) { return this.countVariables("varying", options); },
    
    countAttributes: function(options) { return this.countVariables("attribute", options); },
    
    countUniforms: function(options) { return this.countVariables("uniform", options); },
    
    gatherExports: function() {
      var result = {};
      for (var i = 0; i < this.phases.length; i++) {
        if (this.phases[i].options.exports) {
          Jax.Util.merge(this.phases[i].options.exports, result);
        }
      }
      return result;
    },
    
    getName: function() { return this.name; }
  });
})();