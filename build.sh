echo "Did you change the version?"
read -n1 -r -p "Press any key to continue..."

pushd src
meteor build ../build --server ondemand.meteor.com:80

popd

cd build/android

echo "now sign the apk:"
echo "jarsigner -digestalg SHA1 unaligned.apk \"Film1 On Demand Gids\""

echo "and align the zip:"
echo "~/.meteor/android_bundle/android-sdk/build-tools/21.0.0/zipalign 4 \
    unaligned.apk production.apk"
