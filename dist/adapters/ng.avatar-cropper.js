angular
  .module('ngAvatarCrop')
  .directive('avatarCrop', function () {
    return {
      restrict: 'EA',
      scope: {
        src: '=avatarSource',
        config: '=avatarConfig',
      },
      link: function (scope, element) {
        var avatar = new AvatarCrop(element[0]);

        scope.$watch('src', function (newVal, oldVal) {
          if (newVal !== oldVal) {
            avatar.setSource(newVal);
          }
        });

        scope.$watch('config', function (newVal, oldVal) {
          avatar.config(newVal);
        }, true);

        avatar.addEventListener('change', function () {
          scope.src = avatar.save();
        });

        avatar.addEventListener('clear', function () {
          scope.src = null;
        });
      }
    }
  });
