# tar xf google-cloud-sdk-162.0.0-darwin-x86_64.tar.gz
cd google-cloud-sdk
./install.sh
. ~/.bash_profile
gcloud init
(cd .. && git clone https://github.com/googlecodelabs/your-first-pwapp.git)
(cd .. && git clone https://github.com/GoogleCloudPlatform/python-docs-samples.git)
sudo easy_install pip
pip install -t lib -r requirements.txt

 /c/Python27/Scripts/pip install --target lib --upgrade click==5.1
