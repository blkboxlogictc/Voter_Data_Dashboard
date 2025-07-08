import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ArrowLeft,
  Database,
  Globe2,
  FileCode,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
  Users,
  BarChart3,
} from "lucide-react";

export default function Help() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-4 border-b border-neutral-200">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Help & Documentation
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileCode className="h-5 w-5 mr-2" />
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                The Voter Data Dashboard is a powerful tool for analyzing and
                visualizing election data. To get started, you'll need two types
                of files:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <Database className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-medium">Voter Data (JSON)</h4>
                    <p className="text-sm text-gray-600">
                      Contains individual voter records with demographics and
                      voting history
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Globe2 className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-medium">
                      District Boundaries (GeoJSON)
                    </h4>
                    <p className="text-sm text-gray-600">
                      Geographic boundaries for precincts, districts, or other
                      voting areas
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Voter Data Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Voter Data JSON Structure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Your voter data should be a JSON array where each object
                represents a voter record. Here's the expected structure:
              </p>

              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
                  {`[
  {
    "id": "unique_voter_id",
    "firstName": "John",
    "lastName": "Doe",
    "age": 35,
    "dateOfBirth": "1988-05-15",
    "gender": "M",
    "race": "White",
    "ethnicity": "Non-Hispanic",
    "party": "Democrat",
    "address": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62701",
    "precinct": "Precinct 1",
    "district": "District A",
    "stateHouse": "HD-50",
    "stateSenate": "SD-25",
    "congressional": "CD-13",
    "votingHistory": [
      {
        "election": "2022-11-08",
        "electionType": "General",
        "voted": true,
        "method": "In-Person"
      },
      {
        "election": "2022-06-28",
        "electionType": "Primary",
        "voted": false
      }
    ]
  }
]`}
                </pre>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Required Fields:</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      <code>id</code> - Unique identifier
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      <code>age</code> - Voter age
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      <code>party</code> - Political affiliation
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      <code>precinct</code> - Voting precinct
                    </span>
                  </div>
                </div>

                <h4 className="font-medium text-gray-900 mt-4">
                  Optional Fields:
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm">
                      <code>race</code> - Racial demographics
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm">
                      <code>gender</code> - Gender identity
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm">
                      <code>votingHistory</code> - Past elections
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm">
                      <code>district</code> - Electoral district
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Converting CSV to JSON
                  </span>
                </div>
                <p className="text-sm text-blue-800">
                  If you have voter data in CSV format, you can use ChatGPT or
                  other AI tools to convert it to the required JSON structure.
                  Simply upload your CSV to ChatGPT and ask it to convert the
                  data to match the JSON format shown above.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* GeoJSON Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe2 className="h-5 w-5 mr-2" />
                GeoJSON Structure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Your geographic data should be in GeoJSON format with district
                boundaries. Each feature should have properties that match your
                voter data districts:
              </p>

              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
                  {`{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Precinct 1",
        "district": "District A",
        "precinct": "Precinct 1",
        "stateHouse": "HD-50",
        "stateSenate": "SD-25",
        "congressional": "CD-13"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-89.123, 39.456],
            [-89.124, 39.457],
            [-89.125, 39.456],
            [-89.123, 39.456]
          ]
        ]
      }
    }
  ]
}`}
                </pre>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Key Requirements:</h4>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="text-sm">
                      Must be valid GeoJSON format
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="text-sm">
                      Properties should match district names in voter data
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="text-sm">
                      Supports Polygon and MultiPolygon geometries
                    </span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span className="text-sm">
                      Coordinates should be in [longitude, latitude] format
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">
                    Finding GeoJSON Files
                  </span>
                </div>
                <p className="text-sm text-green-800 mb-2">
                  GeoJSON boundary files can often be found on your local
                  Supervisor of Elections website or government data portals. If
                  you have KML files instead, you can:
                </p>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>
                    • Use ChatGPT or online conversion tools to convert KML to
                    GeoJSON
                  </li>
                  <li>
                    • Use ChatGPT again to ensure the file contains only labeled
                    polygons (no points or lines)
                  </li>
                  <li>• Verify that district names match your voter data</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Census Data Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Census Data Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                The dashboard includes powerful census data integration
                capabilities that allow you to analyze voter registration gaps
                and identify strategic outreach opportunities.
              </p>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    How It Works:
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="bg-purple-100 text-purple-800 rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                        1
                      </div>
                      <div>
                        <h5 className="font-medium">Select Geographic Area</h5>
                        <p className="text-sm text-gray-600">
                          Choose your state and county to automatically fetch
                          relevant census data for your analysis area.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="bg-purple-100 text-purple-800 rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                        2
                      </div>
                      <div>
                        <h5 className="font-medium">Cross-Reference Data</h5>
                        <p className="text-sm text-gray-600">
                          The system compares your voter registration data with
                          census demographics to identify unregistered
                          populations and voting gaps.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="bg-purple-100 text-purple-800 rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                        3
                      </div>
                      <div>
                        <h5 className="font-medium">Generate Insights</h5>
                        <p className="text-sm text-gray-600">
                          Receive detailed profiles of unregistered voters and
                          strategic recommendations for targeted outreach
                          campaigns.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-purple-900">
                      Strategic Analysis Features
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <h6 className="font-medium text-purple-800">
                        Unregistered Voter Profiles:
                      </h6>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>• Age and demographic breakdowns</li>
                        <li>• Income and education levels</li>
                        <li>• Geographic concentration areas</li>
                        <li>• Historical voting patterns by area</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h6 className="font-medium text-purple-800">
                        Outreach Opportunities:
                      </h6>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>• Swing districts with low turnout</li>
                        <li>• Areas with registration gaps</li>
                        <li>• Policy focus recommendations</li>
                        <li>• Targeted messaging strategies</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <span className="font-medium text-amber-900">
                      Strategic Applications
                    </span>
                  </div>
                  <p className="text-sm text-amber-800 mb-2">
                    Use census integration to identify:
                  </p>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>
                      • <strong>Flippable Areas:</strong> Districts where small
                      registration increases could change outcomes
                    </li>
                    <li>
                      • <strong>Policy Priorities:</strong> Issues that resonate
                      with unregistered demographics in specific areas
                    </li>
                    <li>
                      • <strong>Resource Allocation:</strong> Where to focus
                      voter registration and outreach efforts
                    </li>
                    <li>
                      • <strong>Messaging Strategy:</strong> Tailored
                      communication based on local demographic profiles
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                How to Use the Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Upload Your Data</h4>
                    <p className="text-sm text-gray-600">
                      Drag and drop or click to upload your voter data JSON and
                      district boundaries GeoJSON files. The system supports
                      files up to 100MB.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Process & Visualize</h4>
                    <p className="text-sm text-gray-600">
                      Click "Process & Visualize Data" to analyze your files.
                      The system will validate the data and generate
                      comprehensive visualizations.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Explore Insights</h4>
                    <p className="text-sm text-gray-600">
                      View interactive charts, maps, and statistics. Filter by
                      district type and explore demographic breakdowns and
                      voting patterns.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium">Download Results</h4>
                    <p className="text-sm text-gray-600">
                      Export your processed data and visualizations for further
                      analysis or reporting.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sample Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Sample Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Not sure about the format? Use our sample data to explore the
                dashboard features:
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <FileCode className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Quick Start</span>
                </div>
                <p className="text-sm text-blue-800 mb-3">
                  Click "Use Sample Data" on the main dashboard to load
                  pre-formatted example data and see how the visualizations
                  work.
                </p>
                <Link href="/">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Try Sample Data
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Troubleshooting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-red-700">
                    File Upload Issues
                  </h4>
                  <ul className="text-sm text-gray-600 mt-1 space-y-1">
                    <li>• Ensure files are in valid JSON/GeoJSON format</li>
                    <li>• Check file size (maximum 100MB)</li>
                    <li>• Verify all required fields are present</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-red-700">
                    Data Processing Errors
                  </h4>
                  <ul className="text-sm text-gray-600 mt-1 space-y-1">
                    <li>
                      • Ensure district names match between voter data and
                      GeoJSON
                    </li>
                    <li>• Check for missing or invalid data types</li>
                    <li>
                      • Verify coordinate format in GeoJSON (longitude,
                      latitude)
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-red-700">
                    Visualization Issues
                  </h4>
                  <ul className="text-sm text-gray-600 mt-1 space-y-1">
                    <li>• Try different district type filters</li>
                    <li>
                      • Ensure geographic data covers the same area as voter
                      data
                    </li>
                    <li>• Check browser console for detailed error messages</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
