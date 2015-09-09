(function () {
	AvatarCrop.registerFilter('sepia', function (self, canvas) {
		AvatarCrop.execFilter(canvas, {
			sepia: 1
		})
	});
})();
