const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: 'u4bnc0pb',
  api_key: '785873239169827',
  api_secret: '-LqLLSeq8ho_5OfQqzqGAc_vxQ4',
});

const dummyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

cloudinary.uploader.upload(dummyImage)
  .then(res => console.log('Success:', res))
  .catch(err => console.error('Upload Error Object:', JSON.stringify(err, null, 2)));
