import { useState } from 'react';
import { Save, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'business' | 'tax' | 'receipt' | 'notifications' | 'system' | 'password'>('business');

  const handleSave = () => toast.success('Settings saved! (Mock)');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600">Configure your business settings</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4 overflow-x-auto">
          {[
            { key: 'business', label: 'Business Info' },
            { key: 'tax', label: 'Tax & Charges' },
            { key: 'receipt', label: 'Receipt' },
            { key: 'notifications', label: 'Notifications' },
            { key: 'system', label: 'System' },
            { key: 'password', label: 'Password' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 font-medium border-b-2 whitespace-nowrap ${
                activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        {activeTab === 'business' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Business Name</label>
                <input type="text" defaultValue="Kebuli Utsman" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Owner Name</label>
                <input type="text" defaultValue="Ahmad Utsman" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input type="email" defaultValue="owner@kebuliutsman.com" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input type="tel" defaultValue="0812-3456-7890" className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <textarea defaultValue="Jl. Sudirman No. 123, Jakarta" className="w-full px-3 py-2 border rounded-lg" rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Logo</label>
              <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Logo
              </button>
            </div>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        )}

        {activeTab === 'tax' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">Tax & Service Charges</h3>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <input type="checkbox" id="enable-tax" defaultChecked className="w-4 h-4" />
              <label htmlFor="enable-tax">Enable Tax</label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tax Rate (%)</label>
                <input type="number" defaultValue="10" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tax Name</label>
                <input type="text" defaultValue="PB1" className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <input type="checkbox" id="enable-service" defaultChecked className="w-4 h-4" />
              <label htmlFor="enable-service">Enable Service Charge</label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Service Charge (%)</label>
              <input type="number" defaultValue="5" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save Changes</button>
          </div>
        )}

        {activeTab === 'receipt' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">Receipt Settings</h3>
            <div>
              <label className="block text-sm font-medium mb-2">Receipt Header</label>
              <textarea defaultValue="Thank you for visiting Kebuli Utsman!" className="w-full px-3 py-2 border rounded-lg" rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Receipt Footer</label>
              <textarea defaultValue="Visit us again!" className="w-full px-3 py-2 border rounded-lg" rows={2} />
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <input type="checkbox" id="show-logo" defaultChecked className="w-4 h-4" />
              <label htmlFor="show-logo">Show Logo on Receipt</label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Printer Width</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>58mm</option>
                <option selected>80mm</option>
              </select>
            </div>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save Changes</button>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">Notification Settings</h3>
            {['Email notifications', 'Low stock alerts', 'Daily sales report', 'WhatsApp notifications'].map((item) => (
              <div key={item} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span>{item}</span>
                <input type="checkbox" defaultChecked={item !== 'WhatsApp notifications'} className="w-4 h-4" />
              </div>
            ))}
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save Changes</button>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mb-4">System Preferences</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Currency</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>IDR - Indonesian Rupiah</option>
                  <option>USD - US Dollar</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date Format</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time Format</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>24 Hour</option>
                  <option>12 Hour</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>Indonesia</option>
                  <option>English</option>
                </select>
              </div>
            </div>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save Changes</button>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="space-y-4 max-w-md">
            <h3 className="font-semibold text-lg mb-4">Change Password</h3>
            <div>
              <label className="block text-sm font-medium mb-2">Current Password</label>
              <input type="password" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <input type="password" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Confirm New Password</label>
              <input type="password" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <button onClick={() => toast.success('Password changed!')} className="px-4 py-2 bg-orange-600 text-white rounded-lg">
              Change Password
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
