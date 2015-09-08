(function () {

  $.fn.avatarCrop = function (options) {
    if (options1 == 'config') {

    }
    return this.each(function() {
      var avatar = this.data('avatar-crop');
      if (!avatar) {
        avatar = new avatarCrop(this);
        this.data('avatar-crop', avatar);
      }
      avatar.config(options);
    });
  }

})();
