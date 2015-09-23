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
        files: [ 'web/main.html' ],
        tasks: [ 'copy:static' ]
      },
      peg: {
        files: [ 'lang/parser.pegjs' ],
        tasks: [ 'peg' ]
      },
      sass: {
        files: [ 'web/main.scss' ],
        tasks: [ 'sass' ]
      }
    },
    copy: {
      polyfill: {
        src: 'node_modules/babel/browser-polyfill.js',
        dest: 'dist/web/browser-polyfill.js'
      },
      static: {
        src: 'web/main.html',
        dest: 'dist/web/main.html'
      }
    },
    peg: {
      parser: {
        src: 'lang/parser.pegjs',
        dest: 'lang/parser.js'
      }
    },
    sass: {
      options: {
        precision: 10
      },
      web: {
        files: { 'dist/web/bundle.css': 'web/main.scss' }
      }
    },
    browserify: {
      web: {
        files: { 'dist/web/bundle.js': 'web/main.js' }
      },
      worker: {
        files: { 'dist/web/start_worker.js': 'brace_start/start_worker.js' }
      },
      options: {
        watch: true,
        transform: [ 'babelify' ],
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
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-peg');

  grunt.registerTask('once', [ 'copy', 'peg', 'sass', 'browserify' ]);
  grunt.registerTask('default', [ 'copy', 'peg', 'sass', 'browserify', 'watch' ]);
};
