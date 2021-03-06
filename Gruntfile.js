var grunt = require('grunt');

require('load-grunt-tasks')(grunt);

grunt.initConfig({
  clean: {
    dist: ['dist'],
  },
  copy: {
    dist: {
      files: [
        { expand: true, flatten: true, src: ['src/adapters/*'], dest: 'dist/adapters', filter: 'isFile' },
      ]
    }
  },
  concat: {
    options: {
      sourceMap: true
    },
    main: {
      src: ['src/avatar-crop.js', 'src/avatar-filters.js'],
      dest: 'dist/avatar-crop.js',
    },
    full: {
      src: ['src/avatar-crop.js', 'src/avatar-filters.js', 'src/filters/*.js'],
      dest: 'dist/avatar-crop.full.js',
    }
  },
  uglify: {
    options: {
      sourceMap: true
    },
    dist: {
      files: {
        'dist/avatar-crop.min.js': ['src/avatar-crop.js', 'src/avatar-filters.js'],
        'dist/avatar-crop.full.min.js': ['src/avatar-crop.js', 'src/avatar-filters.js', 'src/filters/*.js'],
      }
    }
  }
});

grunt.task.registerTask('build', ['clean:dist', 'concat:main', 'concat:full', 'uglify:dist', 'copy:dist']);
