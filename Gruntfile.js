module.exports = function(grunt) {
  grunt.initConfig({
    watch: {
      config: {
        files: [ 'Gruntfile.js' ],
        options: {
          reload: true
        }
      },
      copy: {
        files: [ 'web/main.html', 'web/main.css' ],
        tasks: [ 'copy:static' ]
      },
      peg: {
        files: [ 'parser.pegjs' ],
        tasks: [ 'peg' ]
      }
    },
    copy: {
      polyfill: {
        src: 'node_modules/babel/browser-polyfill.js',
        dest: 'dist/web/browser-polyfill.js'
      },
      static: {
        expand: true,
        src: [ 'web/main.html', 'web/main.css' ],
        dest: 'dist/'
      }
    },
    peg: {
      options: {
        trackLineAndColumn: true
      },
      parser: {
        src: 'parser.pegjs',
        dest: 'parser.js'
      }
    },
    browserify: {
      web: {
        files: { 'dist/web/bundle.js': 'web/main.js' }
      },
      worker: {
        files: { 'dist/web/start_worker.js': 'web/start_worker.js' }
      },
      options: {
        watch: true,
        transform: [
          [ 'babelify', { ignore: 'parser.js' } ]
        ],
        browserifyOptions: {
          debug: true,
          basedir: 'dist/web'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-peg');

  grunt.registerTask('default', [ 'copy', 'peg', 'browserify', 'watch' ]);
};
