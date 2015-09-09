(function () {
	AvatarCrop.registerFilter('gotham', function (self, imageData, canvas) {
		return AvatarCrop.execFilter(imageData, canvas, {
      desaturate: 1,
      curves: {'a':[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,255], 'r':[0,0,0,1,1,1,1,1,1,1,2,2,2,2,2,3,3,3,4,4,4,5,5,5,6,6,7,7,7,8,8,9,9,10,10,11,11,12,12,12,13,13,14,14,15,15,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,25,25,25,26,26,27,27,28,28,29,29,30,30,31,32,32,33,33,34,34,35,35,36,36,37,38,38,39,39,40,41,41,42,42,43,44,44,45,45,46,47,47,48,48,49,50,50,51,52,52,53,54,54,55,56,57,58,58,59,60,61,62,63,64,65,66,67,68,70,71,73,74,76,77,79,80,82,83,84,86,87,88,90,91,92,94,95,96,98,99,100,102,103,104,106,107,109,110,111,113,114,116,118,119,121,123,124,126,128,129,131,133,135,137,138,140,142,144,146,148,149,151,153,155,156,158,160,162,163,165,167,168,170,172,173,175,176,178,180,181,183,184,186,187,189,191,192,194,195,197,198,200,201,203,204,205,207,208,210,211,213,214,215,217,218,219,221,222,223,224,225,227,228,229,230,231,233,234,235,237,238,239,241,242,244,245,246,248,249,251,252,254,255,255], 'g':[0,0,0,0,0,1,1,1,1,1,1,1,1,1,2,2,2,2,2,3,3,3,4,4,4,4,5,5,5,5,6,6,6,7,7,7,8,8,8,9,9,9,10,10,10,11,11,12,12,12,13,13,14,14,14,15,15,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,26,26,27,28,28,29,30,30,31,32,32,33,34,35,35,36,37,38,39,39,40,41,42,43,44,45,46,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,67,68,69,70,71,72,73,74,75,77,78,79,81,82,83,84,86,87,88,90,91,92,93,95,96,97,99,100,101,102,104,105,106,108,109,110,112,113,115,116,118,119,121,122,124,125,127,128,130,132,133,135,137,138,140,142,143,145,147,149,150,152,154,155,157,159,160,162,163,165,167,168,170,171,173,174,176,177,179,180,182,183,185,186,188,189,191,192,194,195,196,198,199,201,202,204,205,206,208,209,211,212,213,215,216,217,219,220,221,223,224,225,226,228,229,230,232,233,234,236,237,239,240,242,243,245,246,248,249,251,252,254,255,255], 'b':[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,2,2,2,3,3,4,4,4,5,5,6,6,7,7,8,9,9,10,10,11,12,12,13,13,14,15,15,16,17,17,18,19,20,20,21,22,22,23,24,24,25,26,27,27,28,29,30,31,32,33,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,58,59,60,61,62,63,64,66,67,68,69,70,71,73,74,75,76,77,78,79,81,82,83,84,85,86,87,88,89,90,91,92,93,94,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,131,132,133,134,135,136,137,138,139,140,140,141,142,143,144,145,146,148,149,150,151,152,153,155,156,157,158,160,161,162,164,165,166,168,169,171,172,173,175,176,178,179,181,182,184,186,187,189,190,192,194,195,197,199,201,202,204,206,208,210,212,214,216,218,220,222,224,226,228,230,232,234,235,237,239,241,243,244,246,248,250,251,253,255,255]},
		});
	});
})();