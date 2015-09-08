(function () {
	AvatarCrop.addFilter('sepia', function (self, canvas) {
		AvatarCrop.execFilter(canvas, {
			sepia: 1
		})
	});
})();
