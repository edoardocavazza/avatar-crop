(function () {
	AvatarCrop.registerFilter('negative', function (self, imageData, canvas) {
	    var context = canvas.getContext('2d');
	    var data = imageData.data;
	    for (var i = 0; i < data.length; i += 4) {
	        data[i]   = 255 - data[i];   // red
	        data[i+1] = 255 - data[i+1]; // green
	        data[i+2] = 255 - data[i+2]; // blue
	    }
			return imageData;
	});
})();
