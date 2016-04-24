# parkadelphia

[![Join the chat at https://gitter.im/laurenancona/parkadelphia](https://badges.gitter.im/laurenancona/parkadelphia.svg)](https://gitter.im/laurenancona/parkadelphia?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)    [![](https://img.shields.io/badge/licence-GNU%20AGPLv3-blue.svg)](http://www.gnu.org/licenses/agpl-3.0.txt)


*Note:* _If you're interested in working to create a draft specification for parking data, follow [this repository](https://github.com/laurenancona/open-parking-data-spec)_

#### Purpose

1. Procure public data releases via the City's Open Data program to support analysis of relevant regulations.
2. Build web application to present all layers of geospatial data related to on-street and city-owned off-street parking in Philadelphia County. Native applications may be on the roadmap at some point, but the first priority is being accessible to the largest number of users.
3. Using Google Tag Manager, Google Analytics, and [analytics-reporter](https://github.com/18F/analytics-reporter), collect and aggregate anonymous usage data via custom events. Data is made publicly available in an s3 bucket, refreshed daily with lookback of 30 days (for now), and rendered atop a second map view for simple analysis.

#### Current Layers
 - [X] Residential Permit Parking Blocks 
 - [X] Residential Permit Districts (manually created)
 - [X] Partial (Center City) Meter Coordinates (manually plotted)
 - [X] Metered Automobile Parking 
 - [X] Metered Motorcyle/Scooter Corrals (manually plotted)
 - [X] City Owned/Managed Off-Street Lots/Garages (manually plotted)
 - [X] Valet Parking Locations
 - [X] Snow Emergency Routes
 
##### TODO
 - [ ] Handicapped Spaces
 - [ ] Balance of Meter Coordinates
 - [ ] Updated RPP Blocks from data generated 3/22/16
 

#### Choosing layers to include

- does the layer contain data that affects when a motorized vehicle may be parked on a public street or in a city-owned, off-street lot/garage?
_That's it_.
