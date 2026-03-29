package com.mypos.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;

import com.dantsu.escposprinter.EscPosPrinter;
import com.dantsu.escposprinter.connection.bluetooth.BluetoothConnection;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.Set;

@CapacitorPlugin(
    name = "NativeBluetoothPrinter",
    permissions = {
        @Permission(strings = { Manifest.permission.BLUETOOTH_CONNECT }, alias = "bluetooth")
    }
)
public class NativeBluetoothPrinterPlugin extends Plugin {

    private boolean hasBluetoothAccess() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }

        return ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) ==
            PackageManager.PERMISSION_GRANTED;
    }

    private BluetoothAdapter getBluetoothAdapter() {
        return BluetoothAdapter.getDefaultAdapter();
    }

    private void resolvePermissionResult(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasBluetoothAccess());
        call.resolve(result);
    }

    @PluginMethod
    public void ensurePermissions(PluginCall call) {
        if (hasBluetoothAccess()) {
            resolvePermissionResult(call);
            return;
        }

        requestPermissionForAlias("bluetooth", call, "bluetoothPermissionsCallback");
    }

    @PermissionCallback
    private void bluetoothPermissionsCallback(PluginCall call) {
        if (!hasBluetoothAccess()) {
            call.reject("Bluetooth permission denied");
            return;
        }

        resolvePermissionResult(call);
    }

    @PluginMethod
    public void getBluetoothState(PluginCall call) {
        BluetoothAdapter bluetoothAdapter = getBluetoothAdapter();
        JSObject result = new JSObject();
        result.put("available", bluetoothAdapter != null);
        result.put("enabled", bluetoothAdapter != null && bluetoothAdapter.isEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void openBluetoothSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(intent);

        JSObject result = new JSObject();
        result.put("opened", true);
        call.resolve(result);
    }

    @PluginMethod
    public void getBondedPrinters(PluginCall call) {
        if (!hasBluetoothAccess()) {
            call.reject("Bluetooth permission not granted");
            return;
        }

        BluetoothAdapter bluetoothAdapter = getBluetoothAdapter();
        JSObject result = new JSObject();
        result.put("available", bluetoothAdapter != null);
        result.put("enabled", bluetoothAdapter != null && bluetoothAdapter.isEnabled());

        JSArray printers = new JSArray();
        if (bluetoothAdapter != null && bluetoothAdapter.isEnabled()) {
            Set<BluetoothDevice> bondedDevices = bluetoothAdapter.getBondedDevices();
            for (BluetoothDevice device : bondedDevices) {
                JSObject printer = new JSObject();
                printer.put("name", device.getName() != null ? device.getName() : device.getAddress());
                printer.put("address", device.getAddress());
                printer.put("bondState", device.getBondState());
                printer.put("majorClass", device.getBluetoothClass() != null ? device.getBluetoothClass().getMajorDeviceClass() : -1);
                printers.put(printer);
            }
        }

        result.put("printers", printers);
        call.resolve(result);
    }

    @PluginMethod
    public void printFormattedText(PluginCall call) {
        if (!hasBluetoothAccess()) {
          call.reject("Bluetooth permission not granted");
          return;
        }

        String address = call.getString("address");
        String text = call.getString("text");
        int printerDpi = call.getInt("printerDpi", 203);
        Double printerWidthMmValue = call.getDouble("printerWidthMm", 48d);
        float printerWidthMm = printerWidthMmValue.floatValue();
        int printerNbrCharactersPerLine = call.getInt("printerNbrCharactersPerLine", 32);
        Double feedPaperMmValue = call.getDouble("feedPaperMm", 18d);
        float feedPaperMm = feedPaperMmValue.floatValue();
        boolean cutPaper = call.getBoolean("cutPaper", false);

        if (address == null || address.trim().isEmpty()) {
            call.reject("Printer address is required");
            return;
        }

        if (text == null || text.trim().isEmpty()) {
            call.reject("Receipt text is required");
            return;
        }

        BluetoothAdapter bluetoothAdapter = getBluetoothAdapter();
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth is not available on this device");
            return;
        }

        if (!bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is not enabled");
            return;
        }

        BluetoothDevice targetDevice = null;
        for (BluetoothDevice device : bluetoothAdapter.getBondedDevices()) {
            if (address.equalsIgnoreCase(device.getAddress())) {
                targetDevice = device;
                break;
            }
        }

        if (targetDevice == null) {
            call.reject("Selected printer is not paired on this device");
            return;
        }

        final BluetoothDevice printerDevice = targetDevice;
        final String receiptText = text;

        new Thread(() -> {
            EscPosPrinter printer = null;
            try {
                BluetoothConnection connection = new BluetoothConnection(printerDevice);
                printer = new EscPosPrinter(connection, printerDpi, printerWidthMm, printerNbrCharactersPerLine);

                if (cutPaper) {
                    printer.printFormattedTextAndCut(receiptText, feedPaperMm);
                } else {
                    printer.printFormattedText(receiptText, feedPaperMm);
                }

                printer.disconnectPrinter();

                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            } catch (Exception exception) {
                if (printer != null) {
                    printer.disconnectPrinter();
                }
                call.reject("Failed to print receipt: " + exception.getMessage(), exception);
            }
        }).start();
    }
}
