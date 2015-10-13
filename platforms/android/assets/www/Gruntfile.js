module.exports = function(grunt) {



  grunt.initConfig({
    codekit: {
      // build:{
        options: {
          // None yet
        },
        your_target: {
          files : {
            'index.html' : 'kits/index.kit',
            'bootstrap-form.html': 'kits/bootstrap-form.kit',
            'bootstrap-search.html': 'kits/bootstrap-search.kit',
            'drafts.html': 'kits/drafts.kit',
            'form-driver.html': 'kits/form-driver.kit',
            'initial_setup.html': 'kits/initial_setup.kit',
            'settings.html': 'kits/settings.kit',
            
          }
        },
      // },
    },
    watch: {
      kits: {
        files: 'kits/*.kit',
        tasks: [ 'build' ]
      },
      scripts: {
        files: 'js/*.js',
        tasks: [ 'versionnumber']
      },
      css: {
        files: 'css/**',
        tasks: [ 'versionnumber' ]
      },
      // copy: {
      //   files: [ 'source/**', '!source/**/*.styl', '!source/**/*.coffee', '!source/**/*.jade' ],
      //   tasks: [ 'copy' ]
      // }
    },
    connect: {
      server: {
        options: {
          port: 4000,
          base: '.',
          hostname: '*'
        }
      }
    },
  });



  
  grunt.loadNpmTasks('grunt-codekit');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.task.registerTask('versionnumber', 'Outputs the date into version.txt', function() {
    grunt.file.write("./version.txt", new Date())
  });

  grunt.registerTask(
    'build', 
      'Compiles all of the assets and copies the files to the build directory.', 
      [ 'codekit', 'versionnumber' ]
    );

  // Default task(s).
  grunt.registerTask('default', ['connect', 'watch' ]);
  

};