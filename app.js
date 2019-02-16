const express       = require('express'),
      path          = require('path'),
      bodyParser    = require('body-parser'),
      mongoose      = require('mongoose'),
      crypto        = require('crypto'),
      multer        = require('multer'),
      GridfsStorage = require('multer-gridfs-storage'),
      Grid          = require('gridfs-stream'),
      methodOverride= require('method-override');

const app = express();

//MiddleWares
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

const MongoURI = 'mongodb://localhost/mongoUploads'

// mongoose.connect(MongoURI, (err, success) => {
//     if(err){
//         console.log("something wrong with db connection");
//         return;
//     }
//     console.log('db is connected successfully ');
// }) 

let gfs;
const conn = mongoose.createConnection(MongoURI, {useNewUrlParser: true},(err, success) => {
    if(err){
        console.log("there is some error with connectin \n "+err);
    }else{
        console.log("working fine");
    }
});
conn.once('open', () => {
    //Init Stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
});

//Storage Engine
const storage = new GridfsStorage({
    url: MongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
          //crypto.randomBytes() is a module that is used to generate name
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          //if no error than creating file name
          const filename = buf.toString('hex') + path.extname(file.originalname);
          //here fileInfo goes
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads' // 'bucketName' should match with collection name see line no 39 and line no 57
          };
          resolve(fileInfo);
        });
      }); 
    }
  });
const uploadMark = multer({ storage });

//Routes
//@route GET /
//@desc loads the form
app.get('/', (req, res) => {
    gfs.files.find().toArray((err, files) => {
      if(!files || files.length === 0){
        res.render('index', {files: false});
      }else{
        files.map( file => {
          if(file.contentType === 'image/png' || file.contentType === 'image/jpeg'){
            file.isImage = true;
          }else{
            file.isImage = false;
          }
        });
        res.render('index', {files: files});
      }

    });
});

//@route POST /uploads
//@desc uploads the file to DB
app.post('/uploads', uploadMark.single('myfile'), (req, res) => {
    // res.json({file: req.file});
    res.redirect('/');
});

//@route GET /files
//@desc display all files in json
app.get('/files', (req, res) =>{
  gfs.files.find().toArray((err, files) => {
    if(!files || files.length===0){
       return res.status(404).json({
        err: 'No Files Exist...!'
      });
    }

    return res.json(files);
  });
});

//@route GET /files/:filename
//@desc display one file object
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
    if(!file || file.length === 0){
      return res.status(404).json({
        err: 'No such file exist'
      });
    }
    
    return res.json(file);
  });
});

//@route GET /image/:filename
//@desc display one image
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({filename : req.params.filename}, (err, file) => {
    //check if file
    if(!file || file.length === 0){
      return res.status(404).json({
        err: 'No file exist'
      });
    }

    //check if image
    if(file.contentType === 'image/png' || 'file.contentType === image/jpeg'){
      // Read output to browser
      var readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    }else{
      res.status(404).json({
        err: 'No such image is available...'
      });
    }
  });
});

//@route DELETE

app.delete('/files/:id', (req, res) =>{
  //we're using gfs. so, mongoose model's functions are not applicable so findByIdAndRemove will not work here
  gfs.remove({_id: req.params.id, root: 'uploads'}, (err, success) =>{
    if(err){
      res.status(404).json({
        err: 'Not able to delete'
      });
    }
    res.redirect('/');
  });
}); 


port = 4040;
app.listen(port, () => console.log(`Server is started at ${port}`));