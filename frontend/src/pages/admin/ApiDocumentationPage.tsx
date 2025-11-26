import { useState, useEffect } from 'react';
import { Book, Copy, Check, Code, Key, AlertCircle } from 'lucide-react';
import { apiKeyService } from '../../services/apiKeyService';
import type { ApiDocumentation } from '../../services/apiKeyService';
import toast from 'react-hot-toast';

export default function ApiDocumentationPage() {
  const [documentation, setDocumentation] = useState<ApiDocumentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadDocumentation();
  }, []);

  const loadDocumentation = async () => {
    try {
      setLoading(true);
      const docs = await apiKeyService.getDocumentation();
      setDocumentation(docs);
    } catch (error) {
      console.error('Error loading documentation:', error);
      toast.error('Gagal memuat dokumentasi API');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateCurlExample = (endpoint: any) => {
    const params = endpoint.queryParameters
      .filter((p: any) => !p.required)
      .slice(0, 2)
      .map((p: any) => {
        if (p.type === 'string') return `${p.name}=2025-11-01`;
        if (p.type === 'number') return `${p.name}=1`;
        if (p.type === 'boolean') return `${p.name}=true`;
        return '';
      })
      .join('&');

    const url = `${documentation?.baseUrl}${endpoint.path}${params ? '?' + params : ''}`;

    return `curl -X ${endpoint.method} "${url}" \\
  -H "X-API-Key: mypos_live_your_api_key_here"`;
  };

  const generateJsExample = (endpoint: any) => {
    const params = endpoint.queryParameters
      .filter((p: any) => !p.required)
      .slice(0, 2)
      .map((p: any) => {
        if (p.type === 'string') return `${p.name}: '2025-11-01'`;
        if (p.type === 'number') return `${p.name}: 1`;
        if (p.type === 'boolean') return `${p.name}: true`;
        return '';
      })
      .join(', ');

    return `const response = await fetch('${documentation?.baseUrl}${endpoint.path}?${params}', {
  headers: {
    'X-API-Key': 'mypos_live_your_api_key_here'
  }
});
const data = await response.json();
console.log(data);`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat dokumentasi...</p>
        </div>
      </div>
    );
  }

  if (!documentation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Gagal memuat dokumentasi API</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <Book className="w-12 h-12" />
            <div>
              <h1 className="text-3xl font-bold">Owner API Documentation</h1>
              <p className="text-blue-100 mt-2">
                Panduan lengkap untuk menggunakan MyPOS Owner API
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-sm text-blue-100">Base URL</p>
              <p className="font-mono text-sm mt-1">{documentation.baseUrl}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-sm text-blue-100">Version</p>
              <p className="font-mono text-sm mt-1">{documentation.version}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-sm text-blue-100">Auth Type</p>
              <p className="font-mono text-sm mt-1">{documentation.authentication.type}</p>
            </div>
          </div>
        </div>

        {/* Authentication */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Authentication</h2>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              Semua request harus menyertakan API key di header:
            </p>
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm relative">
              <div>{documentation.authentication.headerName}: {documentation.authentication.format}</div>
              <button
                onClick={() => copyToClipboard(`${documentation.authentication.headerName}: mypos_live_abc123...`, 'auth')}
                className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors"
              >
                {copiedCode === 'auth' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Penting:</strong> API key hanya ditampilkan sekali saat pembuatan.
                Simpan dengan aman dan jangan bagikan kepada siapa pun.
              </p>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Code className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">API Endpoints</h2>
          </div>

          {documentation.endpoints.map((endpoint, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Endpoint Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold">
                        {endpoint.method}
                      </span>
                      <code className="text-lg font-mono text-gray-800">{endpoint.path}</code>
                    </div>
                    <p className="text-gray-600">{endpoint.description}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Query Parameters */}
                {endpoint.queryParameters.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3">Query Parameters</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Parameter
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Type
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Required
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {endpoint.queryParameters.map((param: any, pIndex: number) => (
                            <tr key={pIndex}>
                              <td className="px-4 py-2">
                                <code className="text-sm text-blue-600">{param.name}</code>
                              </td>
                              <td className="px-4 py-2">
                                <span className="text-sm text-gray-600">{param.type}</span>
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`px-2 py-1 text-xs rounded ${
                                    param.required
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {param.required ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">{param.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Code Examples */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800">Contoh Request (cURL)</h4>
                  <div className="relative">
                    <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
                      <code className="text-sm">{generateCurlExample(endpoint)}</code>
                    </pre>
                    <button
                      onClick={() =>
                        copyToClipboard(generateCurlExample(endpoint), `curl-${index}`)
                      }
                      className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors text-gray-400"
                    >
                      {copiedCode === `curl-${index}` ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <h4 className="font-semibold text-gray-800 mt-4">Contoh Request (JavaScript)</h4>
                  <div className="relative">
                    <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
                      <code className="text-sm">{generateJsExample(endpoint)}</code>
                    </pre>
                    <button
                      onClick={() =>
                        copyToClipboard(generateJsExample(endpoint), `js-${index}`)
                      }
                      className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors text-gray-400"
                    >
                      {copiedCode === `js-${index}` ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <h4 className="font-semibold text-gray-800 mt-4">Response Example</h4>
                  <div className="relative">
                    <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
                      <code className="text-sm">
                        {JSON.stringify(endpoint.responseExample, null, 2)}
                      </code>
                    </pre>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(endpoint.responseExample, null, 2),
                          `response-${index}`
                        )
                      }
                      className="absolute top-2 right-2 p-2 hover:bg-gray-800 rounded transition-colors text-gray-400"
                    >
                      {copiedCode === `response-${index}` ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Error Codes */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Error Codes</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    HTTP Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Error Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documentation.errorCodes.map((error, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-mono">
                        {error.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-sm text-gray-800">{error.message}</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{error.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
