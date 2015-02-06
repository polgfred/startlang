module.exports = function(grunt) {
  grunt.initConfig({
    watch: {
      config: {
        files: ['Gruntfile.js'],
        options: { reload: true }
      },
      pegjs: {
        files: ['parser.pegjs'],
        tasks: ['shell:pegjs']
      },
      bundle: {
        files: ['*.js', '!Gruntfile.js'],
        tasks: ['shell:bundle']
      }
    },
    shell: {
      pegjs: {
        command: 'pegjs parser.pegjs'
      },
      bundle: {
        command: 'cd web ; browserify main.js --debug | exorcist bundle.js.map > bundle.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['watch']);
};
