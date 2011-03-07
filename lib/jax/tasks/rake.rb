require 'rake'

include FileUtils

namespace :jax do
  desc "Generate a standalone Web app"
  task :package do
    Jax::Packager.invoke
  end
  
  task :gather_resources do
    Jax::ResourceCompiler.new.save(Jax.root.join 'tmp/resources.js')
  end
end
